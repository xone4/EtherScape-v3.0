
// Allows use of gapi and google types globally after scripts are loaded.
// Ensure these are loaded in index.html before this script runs.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

import { DriveFileMetadata } from '../types'; // Added for explicit return type

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || "";
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY_FOR_GAPI_DISCOVERY || ""; // For GAPI discovery
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const APP_FOLDER_NAME = "Etherscape_Generated_Images"; 

let tokenClient: any = null; // GIS Token Client
let gapiLoaded = false;
let gisLoaded = false;
let appFolderId: string | null = null;

export const loadGapiAndGis = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (gapiLoaded && gisLoaded) {
      resolve();
      return;
    }
     if (!CLIENT_ID) {
        return reject(new Error("DRIVE_CLIENT_ID_MISSING"));
    }
    if (!API_KEY) {
        return reject(new Error("DRIVE_API_KEY_MISSING"));
    }

    const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]') as HTMLScriptElement | null;
    const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;

    let gapiReady = false;
    let gisReady = false;

    const checkAndResolve = () => {
      if (gapiReady && gisReady) {
        resolve();
      }
    };

    if (gapiScript) {
      gapiScript.dataset.loadAttempted = 'true';
      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY, // API_KEY already checked
              discoveryDocs: DISCOVERY_DOCS,
            });
            gapiLoaded = true;
            gapiReady = true;
            checkAndResolve();
          } catch (error) {
            console.error('Error initializing GAPI client:', error);
            gapiReady = true; gapiLoaded = false;
            reject(new Error(`DRIVE_GAPI_INIT_FAILED: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
      };
      gapiScript.onerror = () => {
        gapiReady = true; gapiLoaded = false;
        reject(new Error("DRIVE_GAPI_SCRIPT_LOAD_FAILED"));
      }
    } else {
      reject(new Error("DRIVE_GAPI_SCRIPT_NOT_FOUND"));
      return;
    }
    
    if (gisScript) {
      gisScript.dataset.loadAttempted = 'true';
      gisScript.onload = () => {
        try {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID, // CLIENT_ID already checked
            scope: SCOPES,
            callback: '', 
          });
          gisLoaded = true;
          gisReady = true;
          checkAndResolve();
        } catch (error) {
          console.error('Error initializing GIS token client:', error);
          gisReady = true; gisLoaded = false;
          reject(new Error(`DRIVE_GIS_INIT_FAILED: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      gisScript.onerror = () => {
        gisReady = true; gisLoaded = false;
        reject(new Error("DRIVE_GIS_SCRIPT_LOAD_FAILED"));
      }
    } else {
      reject(new Error("DRIVE_GIS_SCRIPT_NOT_FOUND"));
      return;
    }
  });
};


export const signInToDrive = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!gapiLoaded || !gisLoaded || !tokenClient) {
      return reject(new Error("DRIVE_CLIENTS_NOT_INITIALIZED"));
    }
    if (!CLIENT_ID) { // Should have been caught by loadGapiAndGis
        return reject(new Error("DRIVE_CLIENT_ID_MISSING_SIGNIN"));
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        if (resp.error === "popup_closed_by_user") {
          return reject(new Error("DRIVE_AUTH_POPUP_CLOSED"));
        } else if (resp.error === "access_denied") {
          return reject(new Error("DRIVE_AUTH_ACCESS_DENIED"));
        }
        return reject(new Error(`DRIVE_AUTH_ERROR: ${resp.error} - ${resp.details || 'No details'}`));
      }
      window.gapi.client.setToken({ access_token: resp.access_token });
      
      try {
        await findOrCreateAppFolder(); 
        const profile = await window.gapi.client.oauth2.userinfo.get();
        if (!profile || !profile.result || !profile.result.email) {
          return reject(new Error("DRIVE_USER_PROFILE_EMPTY"));
        }
        resolve(profile.result);
      } catch (errorAfterToken: any) {
        console.error("Error after obtaining token (fetching profile or folder op):", errorAfterToken);
        return reject(new Error(`DRIVE_POST_AUTH_ERROR: ${errorAfterToken.message || String(errorAfterToken)}`));
      }
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''}); 
    }
  });
};

export const signOutFromDrive = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken(null);
      appFolderId = null; 
      console.log('User signed out from Google Drive.');
    });
  }
};

export const getDriveAuthToken = () => {
    if (!window.gapi || !window.gapi.client) return null;
    return window.gapi.client.getToken();
};

const findOrCreateAppFolder = async (): Promise<string> => {
  if (appFolderId) return appFolderId;

  if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
    throw new Error("DRIVE_CLIENT_NOT_READY_FOR_FOLDER");
  }

  try {
    const response = await window.gapi.client.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.result.files && response.result.files.length > 0) {
      appFolderId = response.result.files[0].id!;
      return appFolderId;
    } else {
      const fileMetadata = {
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      };
      const folderResponse = await window.gapi.client.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });
      appFolderId = folderResponse.result.id!;
      return appFolderId;
    }
  } catch (error: any) {
    console.error("Error finding or creating app folder in Drive:", error);
    if (error.result && error.result.error) {
         throw new Error(`DRIVE_FOLDER_API_ERROR: Code ${error.result.error.code} - ${error.result.error.message}`);
    }
    throw new Error(`DRIVE_FOLDER_OPERATION_FAILED: ${error.message || String(error)}`);
  }
};


const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(',');
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

export const uploadImageToDrive = async (
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
  if (!window.gapi.client.getToken()) {
    throw new Error("DRIVE_UPLOAD_NOT_AUTHENTICATED");
  }
  if (!appFolderId) {
    try {
      await findOrCreateAppFolder(); 
    } catch (folderError: any) {
      throw new Error(`DRIVE_UPLOAD_FOLDER_UNAVAILABLE_ON_DEMAND: ${folderError.message || String(folderError)}`);
    }
    if (!appFolderId) { 
        throw new Error("DRIVE_UPLOAD_FOLDER_UNAVAILABLE_FINAL");
    }
  }

  let blob: Blob;
  let mimeType = 'image/jpeg'; 

  if (imageUrl.startsWith('data:')) {
    blob = dataUrlToBlob(imageUrl);
    mimeType = blob.type;
  } else if (imageUrl.startsWith('http')) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`DRIVE_UPLOAD_FETCH_FAILED: Status ${response.status} ${response.statusText}`);
      }
      blob = await response.blob();
      mimeType = blob.type || 'image/jpeg'; 
    } catch (fetchError: any) {
      console.error("Error fetching image for Drive upload:", fetchError);
      throw new Error(`DRIVE_UPLOAD_FETCH_ERROR: ${fetchError.message || String(fetchError)}`);
    }
  } else {
    throw new Error("DRIVE_UPLOAD_INVALID_IMAGE_URL");
  }

  const appProperties: { [key: string]: string | undefined } = { 
      concept: concept,
      artStyle: artStyle, 
      aspectRatio: aspectRatio,
      etherscapeOriginalId: originalId, // Updated key
      prompt: prompt,
      isUpscaled: isUpscaled ? 'true' : 'false',
  };
  if (negativePrompt) {
    appProperties.negativePrompt = negativePrompt;
  }
  if (isUpscaled && originalHistoryItemId) {
    appProperties.originalHistoryItemId = originalHistoryItemId;
  }
  if (seed !== undefined) {
    appProperties.seed = String(seed);
  }


  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: [appFolderId],
    description: `Concept: ${concept}\nArt Style: ${artStyle}\nAspect Ratio: ${aspectRatio}\nPrompt: ${prompt}${negativePrompt ? `\nNegative Prompt: ${negativePrompt}` : ''}${isUpscaled ? `\nUpscaled from item ID: ${originalHistoryItemId}` : ''}${seed !== undefined ? `\nSeed: ${seed}` : ''}`, 
    appProperties: appProperties
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  try {
    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      body: form,
    });
    return response.result as DriveFileMetadata; // Cast to DriveFileMetadata
  } catch (error) {
    console.error("Error uploading image to Drive:", error);
    const gapiError = error as any;
    if (gapiError.result && gapiError.result.error) {
        const err = gapiError.result.error;
        let specificReason = err.message;
        if (err.errors && err.errors.length > 0) {
            specificReason = err.errors.map((e: any) => `${e.reason}: ${e.message}`).join('; ');
        }
        throw new Error(`DRIVE_UPLOAD_API_ERROR: Code ${err.code} - ${specificReason}`);
    }
    throw new Error(`DRIVE_UPLOAD_REQUEST_FAILED: ${gapiError.message || String(error)}`);
  }
};

export const listImagesFromDrive = async (): Promise<DriveFileMetadata[]> => {
  if (!window.gapi.client.getToken()) {
    throw new Error("DRIVE_LIST_NOT_AUTHENTICATED");
  }
  if (!appFolderId) {
    try {
      await findOrCreateAppFolder();
    } catch (folderError: any) {
      throw new Error(`DRIVE_LIST_FOLDER_UNAVAILABLE_ON_DEMAND: ${folderError.message || String(folderError)}`);
    }
    if (!appFolderId) {
      throw new Error("DRIVE_LIST_FOLDER_UNAVAILABLE_FINAL");
    }
  }

  try {
    const response = await window.gapi.client.drive.files.list({
      q: `'${appFolderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, thumbnailLink, appProperties, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100 // Adjust page size as needed
    });

    return response.result.files as DriveFileMetadata[];
  } catch (error) {
    console.error("Error listing images from Drive:", error);
    const gapiError = error as any;
    if (gapiError.result && gapiError.result.error) {
      const err = gapiError.result.error;
      throw new Error(`DRIVE_LIST_API_ERROR: Code ${err.code} - ${err.message}`);
    }
    throw new Error(`DRIVE_LIST_REQUEST_FAILED: ${gapiError.message || String(error)}`);
  }
};
