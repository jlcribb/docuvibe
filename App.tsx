
import React, { useState, useEffect } from 'react';
import { ProjectExplorer } from './components/ProjectExplorer';
import { Viewer } from './components/Viewer';
import { LoginScreen } from './components/LoginScreen';
import { NetworkGraphModal } from './components/NetworkGraphModal';
import { analyzeDocument } from './services/geminiService';
import * as driveService from './services/driveService';
import { ParsedDocument, ProcessingStatus, FileSystemNode, User } from './types';
import { AlertCircle, X, Cloud, CloudOff, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectState } from './hooks/useProjectState';

// 18MB Limit
const MAX_FILE_SIZE = 14 * 1024 * 1024; 

const isBrowser = typeof window !== 'undefined';

const INITIAL_SCORING = {
  pertinence: 3,
  quality: 3,
  clarity: 3,
  reliability: 3,
  notes: ''
};

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [driveInited, setDriveInited] = useState(false);
  const [isConfigConfigured, setIsConfigConfigured] = useState(true);
  
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const [isSelectingRoot, setIsSelectingRoot] = useState(false);
  const [rootCandidates, setRootCandidates] = useState<FileSystemNode[]>([]);
  const [isLoadingRoots, setIsLoadingRoots] = useState(false);
  const [showNetworkGraph, setShowNetworkGraph] = useState(false);

  // --- CUSTOM HOOK ---
  const {
    fileSystem,
    setFileSystem,
    currentPath,
    setCurrentPath,
    activeDocumentId,
    setActiveDocumentId,
    activeNode,
    allProjectDocs,
    navigate,
    createFolder,
    moveNode,
    deleteNode,
    duplicateNode,
    renameNode,
    updateVisuals,
    updateScoring,
    updateKeywords,
    addDocument,
    addSection,
    updateSection,
    updateDocumentData
  } = useProjectState(isGuestMode, setError);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isBrowser) {
        if (!driveService.checkConfig()) {
            setIsConfigConfigured(false);
        } else {
            driveService.initGoogleScripts(() => {
                setDriveInited(true);
            });
        }
    }
  }, []);

  // --- DRIVE SYNC ---
  useEffect(() => {
      if (!user || isGuestMode || !driveInited || isSelectingRoot) return;
      
      const fetchContents = async () => {
          try {
             const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : user.email; 
             if (!folderId) return;

             const children = await driveService.listChildren(folderId);
             setFileSystem(prev => {
                 const updatedParent = prev[folderId] ? { ...prev[folderId], children: children.map(c => c.id) } : prev[folderId];
                 const newNodes = children.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
                 
                 if (updatedParent) {
                     return { ...prev, [folderId]: updatedParent, ...newNodes };
                 }
                 return { ...prev, ...newNodes };
             });

          } catch (e) {
              console.error("Failed to sync with Drive", e);
              setError("Failed to synchronize with Google Drive.");
          }
      };

      fetchContents();
  }, [currentPath, user, driveInited, isSelectingRoot, isGuestMode, setFileSystem]);

  // --- AUTH HANDLERS ---
  const handleLogin = async () => {
      if (!isConfigConfigured) {
          setError("Cannot login: API Keys are not configured in code.");
          return;
      }
      try {
          await driveService.signIn();
          setIsSelectingRoot(true);
          setIsLoadingRoots(true);
          const roots = await driveService.listRootFolders();
          setRootCandidates(roots);
          setIsLoadingRoots(false);
      } catch (e) {
          console.error("Login failed", e);
          setError("Google Login Failed. Ensure your origin is added to GCP Console.");
          setIsLoadingRoots(false);
      }
  };

  const handleGuestLogin = () => {
      const guestId = 'guest-root';
      const rootNode: FileSystemNode = {
          id: guestId,
          parentId: null,
          name: 'My Local Projects',
          type: 'project',
          children: []
      };
      
      setIsGuestMode(true);
      setUser({ displayName: "Guest User", email: "guest@local" });
      setFileSystem({ [guestId]: rootNode });
      setCurrentPath([guestId]);
  };

  const handleSelectRoot = (folder: FileSystemNode) => {
      setFileSystem(prev => ({ ...prev, [folder.id]: folder }));
      setUser({ displayName: "Google User", email: folder.id });
      setCurrentPath([folder.id]);
      setIsSelectingRoot(false);
  };

  const handleCreateDefaultRoot = async () => {
      try {
          setIsLoadingRoots(true);
          const root = await driveService.getRootFolder();
          handleSelectRoot(root);
          setIsLoadingRoots(false);
      } catch (e) {
          console.error(e);
          setError("Failed to create default root folder.");
          setIsLoadingRoots(false);
      }
  };

  // --- FILE OPERATIONS ---
  const handleOpenFile = async (nodeId: string) => {
      const node = fileSystem[nodeId];
      if (!node) return;

      if (node.data) {
          setActiveDocumentId(nodeId);
      } else {
          if (isGuestMode) {
              setError("File content missing from memory. Please re-upload.");
              return;
          }

          setStatus('reading');
          try {
              const jsonId = await driveService.findJsonInFolder(nodeId);
              if (!jsonId) throw new Error("Analysis data not found in this folder.");

              const jsonData = await driveService.getFileContent(jsonId);
              const rawFile = await driveService.findRawFileInFolder(nodeId);
              let fileData = undefined;
              if (rawFile) {
                  fileData = await driveService.downloadBinaryFile(rawFile.id);
              }

              const docData = { ...jsonData, id: nodeId, fileData, mimeType: rawFile?.mimeType };
              
              updateDocumentData(nodeId, docData);
              setActiveDocumentId(nodeId);
              setStatus('idle');
          } catch (e) {
              console.error(e);
              setError("Failed to load document content from Drive.");
              setStatus('error');
          }
      }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
        setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Limit is 14MB.`);
        return;
    }

    setStatus('reading');
    setError(null);
    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;

    if (!parentId) {
        setError("Please enter a project folder before uploading.");
        setStatus('idle');
        return;
    }

    try {
      const readFileAsBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      };
      const base64Data = await readFileAsBase64(file);
      
      setStatus('analyzing');
      const result = await analyzeDocument(base64Data, file.type || 'text/plain');
      
      const docName = result.title?.original?.substring(0, 40) || file.name;
      
      if (isGuestMode) {
           const folderId = uuidv4();
           const finalDoc: ParsedDocument = {
                ...result,
                id: folderId,
                scoring: { ...INITIAL_SCORING },
                createdAt: new Date().toISOString(),
                mimeType: file.type || 'text/plain',
                userKeywords: []
           };
           const memoryDoc = { ...finalDoc, fileData: base64Data };
           
           const folderNode: FileSystemNode = {
               id: folderId,
               parentId,
               name: docName,
               type: 'document_folder',
               children: [],
               data: memoryDoc
           };
           addDocument(folderId, folderNode, parentId);

      } else {
           setStatus('uploading');
           const folderNode = await driveService.createFolder(docName, parentId, 'document_folder');
           await driveService.uploadFile(file.name, file, file.type, folderNode.id);
           
           const finalDoc: ParsedDocument = {
               ...result,
               id: folderNode.id,
               scoring: { ...INITIAL_SCORING },
               createdAt: new Date().toISOString(),
               mimeType: file.type || 'text/plain',
               userKeywords: []
           };
           
           const memoryDoc = { ...finalDoc, fileData: base64Data };
           await driveService.uploadFile('analysis.json', JSON.stringify(finalDoc, null, 2), 'application/json', folderNode.id);
           
           const nodeWithData = { ...folderNode, data: memoryDoc };
           addDocument(folderNode.id, nodeWithData, parentId);
      }

      setStatus('complete');
      setTimeout(() => setStatus('idle'), 1000);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred during upload/analysis.");
      setStatus('error');
    }
  };

  const handleSaveWorkspace = () => {
    try {
        setStatus('reading');
        const data = JSON.stringify({
            version: 1,
            timestamp: Date.now(),
            fileSystem,
            type: 'docuvibe_workspace'
        }, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `docuvibe_local_workspace_${new Date().toISOString().slice(0,10)}.json`;
        
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setStatus('complete');
        setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
        console.error("Export failed", e);
        setError("Failed to export workspace.");
        setStatus('error');
    }
  };

  const handleLoadWorkspace = async (file: File) => {
    try {
        setStatus('reading');
        const text = await file.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error("Invalid JSON file.");
        }
        
        const payload: any = data;

        // More robust check: Accept if explicitly a workspace OR if it has a fileSystem structure
        if (payload && typeof payload === 'object' && payload.fileSystem) {
            setFileSystem(payload.fileSystem);
            setIsGuestMode(true);
            setUser({ displayName: "Guest User", email: "guest@local" });
            const rootNode = (Object.values(payload.fileSystem) as FileSystemNode[]).find((n: any) => n.parentId === null) as FileSystemNode;
            if (rootNode) {
                setCurrentPath([rootNode.id]);
            } else {
                const fallbackId = 'guest-root';
                // Ensure a root exists if imported file didn't strictly have one at null
                if (!payload.fileSystem[fallbackId]) {
                    payload.fileSystem[fallbackId] = { id: fallbackId, parentId: null, name: 'Restored', type: 'project', children: [] };
                }
                setCurrentPath([fallbackId]);
            }
            setStatus('complete');
            setTimeout(() => setStatus('idle'), 1000);
        } 
        // Accept as single document backup if sections exist
        else if (payload && typeof payload === 'object' && payload.sections && Array.isArray(payload.sections)) {
            const rootId = 'guest-root';
            const docId = payload.id || uuidv4();
            const docData = { ...payload, id: docId };
            // Fallback for title
            const docTitle = docData.title?.original || docData.title?.spanish || 'Imported Document';

            const rootNode: FileSystemNode = {
                id: rootId,
                parentId: null,
                name: 'Imported Project',
                type: 'project',
                children: [docId]
            };

            const docNode: FileSystemNode = {
                id: docId,
                parentId: rootId,
                name: docTitle,
                type: 'document_folder',
                children: [],
                data: docData
            };

            setFileSystem({ [rootId]: rootNode, [docId]: docNode });
            setIsGuestMode(true);
            setUser({ displayName: "Guest User", email: "guest@local" });
            setCurrentPath([rootId]);
            setStatus('complete');
            setTimeout(() => setStatus('idle'), 1000);
        }
        else {
            throw new Error("Invalid file format. Please upload a valid DocuVibe workspace or document backup.");
        }
    } catch (e) {
        console.error("Import failed", e);
        setError(e instanceof Error ? e.message : "Failed to load workspace file.");
        setStatus('error');
    }
  };

  if (!user) {
      return (
        <LoginScreen 
            isConfigConfigured={isConfigConfigured}
            driveInited={driveInited}
            isSelectingRoot={isSelectingRoot}
            isLoadingRoots={isLoadingRoots}
            rootCandidates={rootCandidates}
            onLogin={handleLogin}
            onGuestLogin={handleGuestLogin}
            onLoadWorkspace={handleLoadWorkspace}
            onCreateDefaultRoot={handleCreateDefaultRoot}
            onSelectRoot={handleSelectRoot}
            onCancelRootSelection={() => setIsSelectingRoot(false)}
        />
      );
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {activeNode && activeNode.data ? (
        <Viewer 
            parsedDocument={activeNode.data} 
            onBack={() => setActiveDocumentId(null)}
            onUpdateScoring={updateScoring}
            onUpdateKeywords={updateKeywords}
            onOpenNetwork={() => setShowNetworkGraph(true)}
            onAddSection={addSection}
            onUpdateSection={updateSection}
        />
      ) : (
         <>
            <div className="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200">
               <div className="flex items-center space-x-2">
                 <div className="font-bold text-xl text-indigo-600 tracking-tight">DocuVibe</div>
                 <span className="text-slate-300">|</span>
                 <span className="text-sm text-slate-500 font-medium">
                     {isGuestMode ? 'Local Mode' : `Drive: ${fileSystem[currentPath[0]]?.name || 'Root'}`}
                 </span>
               </div>
               
               <div className="flex items-center space-x-4">
                   {status === 'complete' && (
                       <div className="flex items-center space-x-2 text-green-600 animate-in fade-in">
                           <CheckCircle2 size={18} />
                           <span className="text-sm font-bold">Saved!</span>
                       </div>
                   )}
                   
                   {status !== 'idle' && status !== 'error' && status !== 'complete' && (
                       <div className="flex items-center space-x-2 text-indigo-600">
                           <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"/>
                           <span className="text-sm font-bold animate-pulse capitalize">
                               {status.replace('_', ' ')}...
                           </span>
                       </div>
                   )}
                   
                   {isGuestMode ? (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold border border-slate-200">
                            <CloudOff size={14} />
                            <span>Local Only</span>
                        </div>
                   ) : (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                            <Cloud size={14} />
                            <span>Synced</span>
                        </div>
                   )}
               </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                <ProjectExplorer 
                    fileSystem={fileSystem}
                    currentPath={currentPath}
                    onNavigate={navigate}
                    onCreateFolder={createFolder}
                    onDeleteNode={deleteNode}
                    onOpenFile={handleOpenFile}
                    onFileUpload={handleFileUpload}
                    onOpenNetwork={() => setShowNetworkGraph(true)}
                    onSaveProject={isGuestMode ? handleSaveWorkspace : undefined}
                    onLoadProject={isGuestMode ? handleLoadWorkspace : undefined}
                    
                    onMoveNode={moveNode}
                    onDuplicateNode={(id) => duplicateNode(id, setStatus)}
                    onRenameNode={renameNode}
                    onUpdateVisuals={updateVisuals}
                    
                    isProcessing={status !== 'idle' && status !== 'error' && status !== 'complete'}
                />
            </div>
            
            <footer className="shrink-0 py-3 bg-slate-50 text-center text-[10px] text-slate-400 border-t border-slate-200">
                @ 2025 jlCribbLibardi
            </footer>

            {showNetworkGraph && (
                <NetworkGraphModal 
                    nodes={allProjectDocs} 
                    onClose={() => setShowNetworkGraph(false)}
                    language="spanish"
                />
            )}

            {error && (
                <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700 shadow-lg z-50 animate-in slide-in-from-bottom-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600"><X size={16}/></button>
                </div>
             )}
         </>
      )}
    </div>
  );
};

export default App;
