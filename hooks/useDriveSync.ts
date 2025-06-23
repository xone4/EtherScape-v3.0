
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadGapiAndGis, signInToDrive, signOutFromDrive, getDriveAuthToken, uploadImageToDrive as driveServiceUploadImage
} from '../services/driveService';
import { LogEntryType, DriveFileMetadata } from '../types';

interface UseDriveSyncProps {
  driveSyncEnabled: boolean;
  setDriveSyncEnabled: (enabled: boolean) => void;
  showToast: (message: string, duration?: number) => void;
  logAppEvent: (type: LogEntryType, message: string, details?: any) => void;
}

export const useDriveSync = ({
  driveSyncEnabled,
  setDriveSyncEnabled,
  showToast,
  logAppEvent,
}: UseDriveSyncProps) => {
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState<boolean>(false);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const hasDriveConfigFailedRef = useRef<boolean>(false);

  const internalSignOut = useCallback((showUserToastLocal = true) => {
    signOutFromDrive();
    setIsDriveAuthenticated(false);
    setDriveUserEmail(null);
    setDriveError(null);
    if (showUserToastLocal) showToast('Signed out from Google Drive.', 2000);
    logAppEvent('DRIVE', 'User signed out from Google Drive.');
  }, [logAppEvent, showToast]);

  useEffect(() => {
    if (driveSyncEnabled && !isDriveAuthenticated && !hasDriveConfigFailedRef.current) {
      setIsDriveLoading(true);
      logAppEvent('DRIVE', 'Drive sync enabled, attempting to load GAPI/GIS.');
      loadGapiAndGis()
        .then(() => {
          logAppEvent('DRIVE', 'GAPI/GIS loaded successfully.');
          const token = getDriveAuthToken();
          if (token && token.access_token) {
            logAppEvent('DRIVE', 'Found existing Drive token, attempting to re-verify.');
            window.gapi.client.setToken({ access_token: token.access_token });
            // Attempt to get user info to confirm auth, signInToDrive also finds/creates folder
            signInToDrive() 
              .then((profile) => {
                setIsDriveAuthenticated(true);
                setDriveUserEmail(profile.email);
                setDriveError(null);
                logAppEvent('DRIVE', 'Drive re-authentication successful.', { email: profile.email });
              })
              .catch(err => {
                logAppEvent('DRIVE', 'Failed to re-verify existing Drive token. User needs to sign in again.', { error: err.message });
                setIsDriveAuthenticated(false);
                setDriveError(`DRIVE_TOKEN_REVERIFY_FAILED: ${err.message}. Please sign in again.`);
                 if (err.message && (err.message.includes('DRIVE_CLIENTS_NOT_INITIALIZED') || err.message.includes('DRIVE_CLIENT_ID_MISSING') || err.message.includes('DRIVE_API_KEY_MISSING') || err.message.includes('DRIVE_GAPI_INIT_FAILED') || err.message.includes('DRIVE_GIS_INIT_FAILED') || err.message.includes('DRIVE_GAPI_SCRIPT_LOAD_FAILED') || err.message.includes('DRIVE_GIS_SCRIPT_NOT_FOUND'))) {
                    hasDriveConfigFailedRef.current = true;
                    setDriveError(`DRIVE_SETUP_FAILED: Critical configuration error. Drive features disabled. ${err.message}`);
                    logAppEvent('ERROR', 'Critical Drive configuration or script loading error. Disabling further attempts.', { error: err.message });
                }
              }).finally(() => setIsDriveLoading(false));
          } else {
            logAppEvent('DRIVE', 'No existing Drive token found. User will need to sign in manually.');
            setIsDriveLoading(false);
          }
        })
        .catch(error => {
          console.error("Failed to load GAPI/GIS:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          logAppEvent('ERROR', 'Failed to load GAPI/GIS for Drive.', { error: errorMessage });
          setDriveError(`DRIVE_SETUP_FAILED: ${errorMessage}`);
          hasDriveConfigFailedRef.current = true;
          setIsDriveLoading(false);
        });
    } else if (!driveSyncEnabled && isDriveAuthenticated) {
      internalSignOut(false);
      logAppEvent('DRIVE', 'Drive sync disabled, signing out user.');
    } else if (driveSyncEnabled && isDriveAuthenticated) {
        // If sync is on and already authenticated, ensure loading is false
        setIsDriveLoading(false);
    }
  }, [driveSyncEnabled, isDriveAuthenticated, logAppEvent, internalSignOut]);

  const handleToggleDriveSync = useCallback(() => {
    const newSyncState = !driveSyncEnabled;
    setDriveSyncEnabled(newSyncState);
    if (!newSyncState && isDriveAuthenticated) {
      internalSignOut();
    }
    setDriveError(null); // Clear previous errors on toggle
    hasDriveConfigFailedRef.current = false; // Reset config failure flag on toggle
    logAppEvent('SYSTEM', `Drive sync toggled ${newSyncState ? 'ON' : 'OFF'}.`);
  }, [driveSyncEnabled, isDriveAuthenticated, setDriveSyncEnabled, internalSignOut, logAppEvent]);

  const handleDriveSignIn = useCallback(async () => {
    setIsDriveLoading(true);
    setDriveError(null);
    logAppEvent('DRIVE', 'Attempting Google Drive sign-in.');
    try {
      const profile = await signInToDrive();
      setIsDriveAuthenticated(true);
      setDriveUserEmail(profile.email);
      showToast(`Signed in to Drive as ${profile.email}`, 2500);
      logAppEvent('DRIVE', 'Google Drive sign-in successful.', { email: profile.email });
    } catch (err: any) {
      setIsDriveAuthenticated(false);
      setDriveUserEmail(null);
      setDriveError(err.message);
      logAppEvent('ERROR', 'Google Drive sign-in failed.', { error: err.message });
      showToast(`Drive Sign-In Failed: ${err.message}`, 4000);
      if (err.message && (err.message.includes('DRIVE_CLIENTS_NOT_INITIALIZED') || err.message.includes('DRIVE_CLIENT_ID_MISSING') || err.message.includes('DRIVE_API_KEY_MISSING') || err.message.includes('DRIVE_GAPI_INIT_FAILED') || err.message.includes('DRIVE_GIS_INIT_FAILED') || err.message.includes('DRIVE_GAPI_SCRIPT_LOAD_FAILED') || err.message.includes('DRIVE_GIS_SCRIPT_NOT_FOUND'))) {
        hasDriveConfigFailedRef.current = true;
        setDriveError(`DRIVE_SETUP_FAILED: Critical configuration error. Drive features disabled. ${err.message}`);
        logAppEvent('ERROR', 'Critical Drive configuration or script loading error during sign-in. Disabling further attempts.', { error: err.message });
      }
    } finally {
      setIsDriveLoading(false);
    }
  }, [logAppEvent, showToast]);

  const handleDriveSignOut = useCallback(() => {
    internalSignOut(true);
  }, [internalSignOut]);

  // Expose the driveServiceUploadImage function
  const uploadImageToDrive = useCallback(async (
    imageUrl: string, 
    filename: string,
    prompt: string,
    concept: string,
    artStyle: string, 
    aspectRatio: string,
    originalId: string, 
    negativePrompt?: string,
    isUpscaled?: boolean,
    originalHistoryItemId?: string,
    seed?: number 
  ): Promise<DriveFileMetadata> => {
    if (!driveSyncEnabled || !isDriveAuthenticated) {
      throw new Error("Drive sync is not enabled or user is not authenticated.");
    }
    return driveServiceUploadImage(
      imageUrl, filename, prompt, concept, artStyle, aspectRatio, originalId, 
      negativePrompt, isUpscaled, originalHistoryItemId, seed
    );
  }, [driveSyncEnabled, isDriveAuthenticated]);


  return {
    isDriveAuthenticated,
    driveUserEmail,
    isDriveLoading,
    driveError,
    setDriveError, // Expose setter for useImageGeneration to update drive error on upload fail
    handleToggleDriveSync,
    handleDriveSignIn,
    handleDriveSignOut,
    uploadImageToDrive, // Return the upload function
  };
};
