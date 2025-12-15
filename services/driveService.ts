
import { FileSystemNode, NodeType, ParsedDocument } from "../types";

// Declare global types for Google API libraries loaded via script tags
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// NOTE: In a real production app, these should be environment variables.
// Users must replace these with their own Google Cloud Credentials enabled for Drive API.
const CLIENT_ID = '568640544726-81kshqj6u0k3lo2dgs6clnak7lhr7i4d.apps.googleusercontent.com'; 
const API_KEY = 'AIzaSyAaPYDtCEzGKZuwrBnGQmz47Fkk_Ubkyns'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Drive Mime Types
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_MIME = 'application/json';

export const checkConfig = () => {
  return (CLIENT_ID as string) !== 'CLIENT_ID' && (API_KEY as string) !== 'API_KEY';
};

export const initGoogleScripts = (onInit: () => void) => {
  if (!checkConfig()) {
      console.warn("Google API Keys are placeholders. Init deferred.");
      return;
  }

  const script1 = document.createElement('script');
  script1.src = "https://apis.google.com/js/api.js";
  script1.onload = () => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [],
        });
        
        // Use standard shorthand for loading Drive API v3
        await window.gapi.client.load('drive', 'v3');
        
        gapiInited = true;
        if (gisInited) onInit();
      } catch (e) {
        console.error("GAPI Init Error:", e);
      }
    });
  };
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = "https://accounts.google.com/gsi/client";
  script2.onload = () => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
      });
      gisInited = true;
      if (gapiInited) onInit();
    } catch (e) {
      console.error("GIS Init Error:", e);
    }
  };
  document.body.appendChild(script2);
};

export const signIn = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject("Google scripts not loaded or invalid configuration");
    
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      // Critical: Set the token for GAPI client to use in requests
      if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken(resp);
      }
      resolve(resp.access_token);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const listRootFolders = async (): Promise<FileSystemNode[]> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: "'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trash = false",
      fields: 'files(id, name, mimeType, properties, appProperties)',
      pageSize: 20, 
    });

    const files = response.result.files;
    if (!files) return [];

    return files.map((f: any) => ({
         id: f.id,
         parentId: 'root',
         name: f.name,
         type: 'project',
         children: [],
         mimeType: f.mimeType,
         icon: f.appProperties?.icon,
         color: f.appProperties?.color
    }));
  } catch (e) {
    console.error("Error listing root folders", e);
    throw e;
  }
};

export const listChildren = async (parentId: string): Promise<FileSystemNode[]> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `'${parentId}' in parents and trash = false`,
      fields: 'files(id, name, mimeType, properties, appProperties)',
      pageSize: 100,
    });

    const files = response.result.files;
    if (!files) return [];

    return files.map((f: any) => {
       let type: NodeType = 'section';
       if (f.properties?.type) {
         type = f.properties.type;
       } else if (f.mimeType === FOLDER_MIME) {
         type = 'section'; 
       } else {
         type = 'document_folder'; 
       }

       return {
         id: f.id,
         parentId,
         name: f.name,
         type: type,
         children: [], 
         mimeType: f.mimeType,
         icon: f.appProperties?.icon,
         color: f.appProperties?.color
       };
    });
  } catch (e) {
    console.error("Error listing children", e);
    throw e;
  }
};

export const createFolder = async (name: string, parentId: string, type: NodeType): Promise<FileSystemNode> => {
  const fileMetadata = {
    name,
    mimeType: FOLDER_MIME,
    parents: parentId === 'root' ? [] : [parentId], 
    properties: {
      type: type,
      createdBy: 'DocuVibe'
    }
  };

  const response = await window.gapi.client.drive.files.create({
    resource: fileMetadata,
    fields: 'id, name, mimeType',
  });

  return {
    id: response.result.id,
    parentId,
    name: response.result.name,
    type,
    children: []
  };
};

export const uploadFile = async (
  name: string, 
  content: string | Blob, 
  mimeType: string, 
  parentId: string
): Promise<string> => {
  
  const metadata = {
    name,
    mimeType,
    parents: [parentId],
  };

  const tokenObject = window.gapi.client.getToken();
  if (!tokenObject) throw new Error("No access token available. Please sign in.");
  const accessToken = tokenObject.access_token;

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  
  if (typeof content === 'string') {
     if (mimeType === 'application/json') {
         form.append('file', new Blob([content], { type: mimeType }));
     } else {
         const byteCharacters = atob(content);
         const byteNumbers = new Array(byteCharacters.length);
         for (let i = 0; i < byteCharacters.length; i++) {
             byteNumbers[i] = byteCharacters.charCodeAt(i);
         }
         const byteArray = new Uint8Array(byteNumbers);
         form.append('file', new Blob([byteArray], { type: mimeType }));
     }
  } else {
     form.append('file', content);
  }

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });
  
  const val = await res.json();
  return val.id;
};

export const getRootFolder = async (): Promise<FileSystemNode> => {
  const response = await window.gapi.client.drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='DocuVibe Projects' and trash = false",
    fields: 'files(id, name, mimeType)',
  });

  if (response.result.files && response.result.files.length > 0) {
    const f = response.result.files[0];
    return { id: f.id, name: f.name, parentId: null, type: 'project', children: [] };
  } else {
    const fileMetadata = {
        name: 'DocuVibe Projects',
        mimeType: FOLDER_MIME,
        properties: { type: 'project' }
    };
    const createRes = await window.gapi.client.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
    });
    return { id: createRes.result.id, name: createRes.result.name, parentId: null, type: 'project', children: [] };
  }
};

export const getFileContent = async (fileId: string): Promise<any> => {
    const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });
    return response.result; 
};

export const findJsonInFolder = async (folderId: string): Promise<string | null> => {
    const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/json' and name contains 'analysis' and trash = false`,
        fields: 'files(id)',
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    }
    return null;
};

export const findRawFileInFolder = async (folderId: string): Promise<{id: string, mimeType: string} | null> => {
     const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/json' and mimeType != '${FOLDER_MIME}' and trash = false`,
        fields: 'files(id, mimeType)',
    });
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0];
    }
    return null;
}

export const downloadBinaryFile = async (fileId: string): Promise<string> => {
    const tokenObject = window.gapi.client.getToken();
    if (!tokenObject) throw new Error("No access token available.");
    const accessToken = tokenObject.access_token;
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64data = (reader.result as string).split(',')[1];
             resolve(base64data);
        }
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// --- NEW FEATURES ---

export const renameFile = async (fileId: string, newName: string): Promise<void> => {
    await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: newName }
    });
};

export const moveFile = async (fileId: string, newParentId: string): Promise<void> => {
    // 1. Get current parents
    const file = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'parents'
    });
    const previousParents = file.result.parents.join(',');
    
    // 2. Update parents
    await window.gapi.client.drive.files.update({
        fileId: fileId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, parents'
    });
};

export const copyFile = async (fileId: string, newName: string, parentId: string): Promise<FileSystemNode> => {
    const response = await window.gapi.client.drive.files.copy({
        fileId: fileId,
        resource: {
            name: newName,
            parents: [parentId]
        },
        fields: 'id, name, mimeType, properties, appProperties'
    });
    
    const f = response.result;
    // Infer type similar to listChildren
    let type: NodeType = 'section';
    if (f.properties?.type) type = f.properties.type;
    else if (f.mimeType === FOLDER_MIME) type = 'section';
    else type = 'document_folder';

    return {
        id: f.id,
        parentId,
        name: f.name,
        type,
        children: [],
        mimeType: f.mimeType,
        icon: f.appProperties?.icon,
        color: f.appProperties?.color
    };
};

export const updateNodeVisuals = async (fileId: string, icon?: string, color?: string): Promise<void> => {
    const appProperties: any = {};
    if (icon) appProperties.icon = icon;
    if (color) appProperties.color = color;

    await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: { appProperties }
    });
};
