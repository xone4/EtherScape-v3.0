import { TroubleshootingGuideData } from './types';

export const troubleshootingGuideData: TroubleshootingGuideData = [
  {
    "problem": "Application shows 'API_KEY environment variable not set' or Gemini generations fail by default.",
    "solution": "This refers to the primary API key for the default Google Gemini provider. It should be configured in the application's environment by the administrator. If you are self-hosting, ensure the `API_KEY` environment variable is correctly set. For other providers (like Stability AI, Leonardo.Ai, etc.), you can enter your own keys in Advanced Settings > Image Providers."
  },
  {
    "problem": "Images are not generating, or I see 'Failed to generate' errors.",
    "solution": "1. Check your internet connection. 2. For the default Gemini provider, the pre-configured API key might have issues (e.g., quota). For other providers, verify your entered API key is valid, active, and has billing/quota enabled with that provider service (check Advanced Settings > Image Providers). 3. Open your browser's developer console (usually F12) and look for more specific error messages from the selected AI provider. The error usually indicates the source. 4. You might have hit API rate limits for the specific provider; wait a bit and try again. 5. If you see a '429 RESOURCE_EXHAUSTED' or similar quota error, see the specific troubleshooting item for that provider or the general quota item."
  },
  {
    "problem": "How do I use image providers other than Google Gemini (e.g., Stability AI, Leonardo)?",
    "solution": "For providers that require an API key (like Stability AI, Black Forest Labs, Replicate, Leonardo.Ai), you need to enter your personal API key. Go to Advanced Settings > Image Providers tab. Select the desired provider from the dropdown. If it requires a key, an input field will appear. Enter your key and click 'Save [Provider Name] Key'. Keys are stored in your browser's local storage for convenience, so avoid using this on public computers. The default Google Gemini provider is pre-configured and doesn't need a user-supplied key."
  },
  {
    "problem": "Generation fails with a specific provider, but others might work. / Error message mentions a specific provider.",
    "solution": "1. Double-check that you've entered the correct API key for that provider in Advanced Settings > Image Providers, and that it's active and has credit/quota. 2. Ensure the selected model for that provider is appropriate for your prompt or account type. 3. Pay close attention to the error message displayed in the app; it often comes directly from the provider and can give specific clues (e.g., 'invalid API key', 'quota exceeded', 'model not found', 'billing required'). 4. Some providers have status pages you can check for outages. 5. If the issue persists with one provider, try switching to another, or check the failover system by letting the app try alternatives."
  },
  {
    "problem": "What happens if my selected provider runs out of quota or has a temporary issue?",
    "solution": "Etherscape has an automatic failover system. If your primary selected provider/model fails (especially due to quota, billing, or rate limit issues), the app will attempt to use the next provider in a predefined sequence (e.g., Gemini, Stability AI, Black Forest Labs, Leonardo.Ai, Replicate). You'll see a toast message if a switch occurs. If all providers in the sequence fail, a final error message will be shown."
  },
  {
    "problem": "The image looks very different from what I expected from a specific model.",
    "solution": "1. Ensure the correct Provider AND Model are selected in Advanced Settings and reflected in the 'Controls & Info' panel. Different models, even from the same provider, can have vastly different outputs. 2. The effectiveness of 'Art Style' can vary significantly between models. Some models might interpret art style prompts more literally than others. 3. Prompt engineering is key! Try rephrasing your concept or adding more descriptive details. 4. Check if the 'Default (AI Decides)' art style produces a better result for that model as a baseline."
  },
  {
    "problem": "Error message includes '429 RESOURCE_EXHAUSTED', 'quota', 'limit', or 'billing'.",
    "solution": "This error means you've exceeded your current usage quota or hit a rate limit for the specific API provider (e.g., Gemini, Stability AI). Check your account with that provider (e.g., Google Cloud project, Stability AI dashboard) for plan and billing details. Ensure billing is active and your usage tiers are appropriate. You may need to wait for your quota to reset or request a quota increase. The app will attempt to failover to another provider if this occurs."
  },
  {
    "problem": "Google Drive Sync shows 'Required application configuration (Client ID or API Key) is missing'.",
    "solution": "This means the application is not correctly set up by the administrator to use Google Drive. The `GOOGLE_DRIVE_CLIENT_ID` or `GOOGLE_DRIVE_API_KEY_FOR_GAPI_DISCOVERY` environment variables are missing or incorrect. If you are self-hosting, ensure these are properly configured in your environment."
  },
  {
    "problem": "Google Drive sign-in fails or shows errors like 'Authentication popup was closed' or 'Access to Google Drive was denied'.",
    "solution": "1. Ensure pop-ups are not blocked for this site. 2. When the Google Sign-In window appears, make sure you select your Google account and explicitly grant all requested permissions. If you close the popup or deny permissions, sign-in will fail. Try signing in again. 3. If the problem persists, try clearing site cookies/data for this app and attempt sign-in again."
  },
  {
    "problem": "Google Drive Sign-In Succeeded, but failed to complete setup (e.g., folder access).",
    "solution": "This means the app authenticated with Google, but couldn't perform a necessary follow-up step, like accessing or creating the 'Etherscape_Generated_Images' folder. This could be due to unusual permission settings on your Drive or a temporary Google service issue. Try signing out from Drive within the app and signing back in. If the issue persists, check your Google Drive for any restrictions."
  },
  {
    "problem": "Images are not saving to Google Drive, and I see 'Insufficient permissions or Google Drive quota exceeded'.",
    "solution": "This error from Google Drive means either: 1. Your Google Drive account is out of storage space. Please check your Drive storage and free up space if necessary. 2. The application doesn't have the necessary permissions to upload files to your Drive. This is less common if sign-in was successful, but you can try signing out of Drive from the app and signing back in, ensuring you grant all requested permissions (specifically 'drive.file' scope which allows creating files in the app's folder). 3. There might be specific sharing or security policies on your Google account or organization (if using a GSuite account) that restrict third-party app access."
  },
  {
    "problem": "Drive Upload Failed: Authentication lost. Please sign in to Drive again.",
    "solution": "Your session with Google Drive may have expired or become invalid. Please use the 'Sign In with Google Drive' button in the Controls panel to re-authenticate."
  },
  {
    "problem": "localStorage 'QuotaExceededError': Cannot save history or concepts.",
    "solution": "Browser localStorage has limited space (usually 5-10MB). Image history is now limited to 10 items to mitigate this. If it still occurs, try clearing site data for this app in your browser settings (this will remove saved concepts and local history)."
  },
  {
    "problem": "The 'Start Evolving' button doesn't stop, or the evolution is erratic.",
    "solution": "This could be due to unexpected state changes or timing issues. Try refreshing the page. If the problem persists, check the browser console for errors. Recent fixes have aimed to stabilize this."
  },
  {
    "problem": "App is slow or unresponsive.",
    "solution": "Image generation and AI processing can be resource-intensive. Ensure your device has a stable internet connection and sufficient resources. Close unnecessary browser tabs or applications. If using Google Drive sync, network speed can also be a factor."
  }
];