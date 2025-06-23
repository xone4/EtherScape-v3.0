
import { useState, useCallback, useRef } from 'react';
import { GenerationOptions } from '../types'; // Assuming GenerationOptions is compatible

// Interface for the expected structure of messages from Fal.ai WebSocket
interface FalRealtimeResult {
  images?: { url: string; content_type: string; }[];
  status?: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | string; 
  logs?: { message: string; level: string; }[];
  seed?: number;
  error?: { message: string; type: string; status_code?: number };
  message?: string; // Sometimes error messages are at the top level
  request_id?: string;
  num_inference_steps?: number;
  timings?: Record<string, number>;
}

export const useFalRealtime = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // const [progress, setProgress] = useState<number>(0); // Optional: for progress updates
  const wsRef = useRef<WebSocket | null>(null);

  const generate = useCallback((apiKey: string, modelIdWithPath: string, options: GenerationOptions & {width?: number, height?: number}) => {
    setIsLoading(true);
    setImageUrl(null);
    setError(null);
    // setProgress(0);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Fal.ai WebSocket: Closing existing open connection before starting new one.");
      wsRef.current.close();
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log("Fal.ai WebSocket: Aborting previous connecting attempt.");
      wsRef.current.close(); // This should trigger onclose for the previous one
    }
    wsRef.current = null;
    
    const modelName = modelIdWithPath.includes('/') ? modelIdWithPath.split('/')[1] : modelIdWithPath;
    const wsUrl = `wss://fal.run/realtime`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Fal.ai WebSocket connected for model: ${modelName}`);
      // Fal.ai options are usually flat at the root of the payload
      // Ensure width and height are included if provided in options
      const { prompt, negativePrompt, seed, width, height, steps, cfgScale } = options;
      const requestPayload: any = {
        "fal_serverless.model_id": modelName,
        "fal_serverless.auth_token": apiKey,
        prompt,
      };
      if (negativePrompt) requestPayload.negative_prompt = negativePrompt;
      if (seed !== undefined) requestPayload.seed = seed;
      if (width !== undefined) requestPayload.width = width;
      if (height !== undefined) requestPayload.height = height;
      if (steps !== undefined) requestPayload.num_inference_steps = steps; // Common for SD models
      if (cfgScale !== undefined) requestPayload.guidance_scale = cfgScale; // Common for SD models
      
      console.log("Fal.ai WebSocket sending payload:", requestPayload);
      ws.send(JSON.stringify(requestPayload));
    };

    ws.onmessage = (event) => {
      try {
        const result: FalRealtimeResult = JSON.parse(event.data as string);
        console.log("Fal.ai WebSocket message received:", result);

        let errorMessage : string | null = null;
        if (result.error) {
          errorMessage = `${result.error.type || 'FalError'}: ${result.error.message}${result.error.status_code ? ` (Status: ${result.error.status_code})` : '' }`;
        } else if (result.message && result.status === 'FAILED') {
            errorMessage = `Fal.ai Generation Failed: ${result.message}`;
        } else if (result.logs) {
            const errorLog = result.logs.find(log => log.level === "ERROR" || log.level === "CRITICAL");
            if (errorLog) errorMessage = `Fal.ai Log Error: ${errorLog.message}`;
        }

        if(errorMessage){
          setError(errorMessage);
          setIsLoading(false);
          if (wsRef.current === ws) ws.close(); // Close only if it's the current WebSocket
          return;
        }

        if (result.images && result.images.length > 0 && result.images[0].url) {
          setImageUrl(result.images[0].url);
        }

        if (result.status === 'COMPLETED') {
          setIsLoading(false);
          // setProgress(100);
          // Don't close immediately, parent component will decide based on final image processing.
        } else if (result.status === 'FAILED') { // Should be caught by error checks above, but as a fallback
          setError(result.message || result.error?.message || 'Fal.ai generation explicitly failed.');
          setIsLoading(false);
          if (wsRef.current === ws) ws.close();
        }
      } catch (e) {
        const parseError = e instanceof Error ? e.message : String(e);
        console.error("Error parsing Fal.ai WebSocket message or unexpected format:", parseError, event.data);
        setError(`Received malformed data from Fal.ai: ${parseError}`);
        setIsLoading(false);
        if (wsRef.current === ws) ws.close();
      }
    };

    ws.onerror = (event) => {
      console.error('Fal.ai WebSocket error:', event);
      const errorEvent = event as ErrorEvent; // For browsers that provide ErrorEvent
      const message = errorEvent.message || 'A WebSocket connection error occurred with Fal.ai.';
      setError(message);
      setIsLoading(false);
      // ws.close() will be called by onclose handler
    };

    ws.onclose = (event) => {
      console.log(`Fal.ai WebSocket disconnected. Code: ${event.code}, Reason: '${event.reason}'. WasClean: ${event.wasClean}`);
      if (wsRef.current === ws) { // Only act if this is the active WebSocket closing
        // If it's still loading and no specific error has been set, it might be an unexpected closure.
        if (isLoading && !error) {
            if(event.code !== 1000 && event.code !== 1005) { // 1000 = normal, 1005 = no status
                 setError(`Fal.ai connection closed unexpectedly (Code: ${event.code}). Please try again.`);
            }
        }
        setIsLoading(false); 
        wsRef.current = null;
      }
    };

  }, []); // Removed isLoading and error from deps to prevent re-creation issues

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, "User initiated disconnect"); // 1000 for normal closure
      wsRef.current = null;
      console.log("Fal.ai WebSocket manually disconnected by user.");
    }
    // Reset state, ensuring this doesn't fight with ongoing operations if generate is called immediately after
    setIsLoading(false);
    // setImageUrl(null); // Let the parent component decide if it wants to clear the image
    // setError(null);
    // setProgress(0);
  }, []);


  return { imageUrl, isLoading, error, /*progress,*/ generate, disconnect };
};
