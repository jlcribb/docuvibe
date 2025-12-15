
import { useState, useCallback } from 'react';
import { FileSystemNode, NodeType, ScoringCriteria, ParsedDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as driveService from '../services/driveService';

export const useProjectState = (isGuestMode: boolean, onError: (msg: string) => void) => {
  const [fileSystem, setFileSystem] = useState<Record<string, FileSystemNode>>({});
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const activeNode = activeDocumentId ? fileSystem[activeDocumentId] : null;
  const allProjectDocs = (Object.values(fileSystem) as FileSystemNode[]).filter(n => n.type === 'document_folder');

  const navigate = useCallback((nodeId: string | null, rootId?: string) => {
    if (nodeId === null) {
      if (isGuestMode) {
        // Find guest root or use provided one
        const root = rootId || (Object.values(fileSystem) as FileSystemNode[]).find(n => n.parentId === null)?.id || 'guest-root';
        setCurrentPath([root]);
      } else if (rootId) {
        setCurrentPath([rootId]);
      }
      return;
    }
    const index = currentPath.indexOf(nodeId);
    if (index !== -1) {
      setCurrentPath(prev => prev.slice(0, index + 1));
    } else {
      setCurrentPath(prev => [...prev, nodeId]);
    }
  }, [currentPath, isGuestMode, fileSystem]);

  const createFolder = async (name: string, type: NodeType) => {
    const parentId = currentPath[currentPath.length - 1];
    if (!parentId) return;

    if (isGuestMode) {
      const newId = uuidv4();
      const newNode: FileSystemNode = {
        id: newId,
        parentId,
        name,
        type,
        children: []
      };
      setFileSystem(prev => {
        const parent = prev[parentId];
        return {
          ...prev,
          [parentId]: { ...parent, children: [...parent.children, newId] },
          [newId]: newNode
        };
      });
    } else {
      try {
        const newNode = await driveService.createFolder(name, parentId, type);
        setFileSystem(prev => {
          const parent = prev[parentId];
          return {
            ...prev,
            [parentId]: { ...parent, children: [...parent.children, newNode.id] },
            [newNode.id]: newNode
          };
        });
      } catch (e) {
        console.error("Create folder failed", e);
        onError("Could not create folder in Google Drive.");
      }
    }
  };

  const moveNode = async (nodeId: string, newParentId: string) => {
    if (isGuestMode) {
        setFileSystem(prev => {
            const node = prev[nodeId];
            const oldParent = node.parentId ? prev[node.parentId] : null;
            const newParent = prev[newParentId];
            
            if (!node || !newParent) return prev;
            if (node.parentId === newParentId) return prev; // No change

            const next = { ...prev };
            // Remove from old parent
            if (oldParent) {
                next[oldParent.id] = { ...oldParent, children: oldParent.children.filter(c => c !== nodeId) };
            }
            // Add to new parent
            next[newParentId] = { ...newParent, children: [...newParent.children, nodeId] };
            // Update node
            next[nodeId] = { ...node, parentId: newParentId };
            return next;
        });
    } else {
        try {
            await driveService.moveFile(nodeId, newParentId);
            // Optimistic update logic usually requires full sync, but we can try local update too
            // For now, relying on the parent refresh logic in App or simplified reload
        } catch (e) {
            onError("Failed to move file in Drive.");
        }
    }
  };

  const deleteNode = async (id: string) => {
    if (isGuestMode) {
      setFileSystem(prev => {
        const node = prev[id];
        if (!node) return prev;
        const parent = node.parentId ? prev[node.parentId] : null;
        const next = { ...prev };
        if (parent) {
          next[parent.id] = {
            ...parent,
            children: parent.children.filter(c => c !== id)
          };
        }
        delete next[id];
        return next;
      });
    } else {
      onError("Deletion is disabled in Cloud mode to protect your Drive files.");
    }
  };

  const duplicateNode = async (nodeId: string, setStatus?: (s: any) => void) => {
      const node = fileSystem[nodeId];
      if (!node) return;
      const newName = `${node.name} (Copy)`;
      
      if (isGuestMode) {
          const newId = uuidv4();
          const newData = node.data ? { ...node.data, id: newId, title: { ...node.data.title, original: newName } } : undefined;
          
          const newNode: FileSystemNode = {
              ...node,
              id: newId,
              name: newName,
              children: [], 
              data: newData
          };
          
          setFileSystem(prev => {
              const parent = node.parentId ? prev[node.parentId] : null;
              const next = { ...prev, [newId]: newNode };
              if (parent) {
                  next[parent.id] = { ...parent, children: [...parent.children, newId] };
              }
              return next;
          });
      } else {
          if (!node.parentId) return;
          try {
              if(setStatus) setStatus('processing');
              const newNode = await driveService.copyFile(nodeId, newName, node.parentId);
              setFileSystem(prev => {
                  const parent = prev[node.parentId!];
                  return {
                      ...prev,
                      [parent.id]: { ...parent, children: [...parent.children, newNode.id] },
                      [newNode.id]: newNode
                  };
              });
              if(setStatus) setStatus('idle');
          } catch (e) {
              onError("Failed to copy file in Drive.");
              if(setStatus) setStatus('error');
          }
      }
  };

  const renameNode = async (nodeId: string, newName: string) => {
      if (isGuestMode) {
          setFileSystem(prev => ({
              ...prev,
              [nodeId]: { ...prev[nodeId], name: newName }
          }));
      } else {
          try {
              await driveService.renameFile(nodeId, newName);
              setFileSystem(prev => ({
                  ...prev,
                  [nodeId]: { ...prev[nodeId], name: newName }
              }));
          } catch(e) {
              onError("Failed to rename in Drive");
          }
      }
  };

  const updateVisuals = async (nodeId: string, icon: string, color: string) => {
      if (isGuestMode) {
          setFileSystem(prev => ({
              ...prev,
              [nodeId]: { ...prev[nodeId], icon, color }
          }));
      } else {
          try {
              await driveService.updateNodeVisuals(nodeId, icon, color);
              setFileSystem(prev => ({
                  ...prev,
                  [nodeId]: { ...prev[nodeId], icon, color }
              }));
          } catch(e) {
              onError("Failed to update visuals in Drive");
          }
      }
  };

  const updateScoring = (newScoring: ScoringCriteria) => {
      if (!activeDocumentId) return;
      setFileSystem(prev => {
          const node = prev[activeDocumentId];
          if (!node || !node.data) return prev;
          return {
              ...prev,
              [activeDocumentId]: {
                  ...node,
                  data: { ...node.data, scoring: newScoring }
              }
          };
      });
  };

  const updateKeywords = (newKeywords: string[]) => {
      if (!activeDocumentId) return;
      setFileSystem(prev => {
          const node = prev[activeDocumentId];
          if (!node || !node.data) return prev;
          return {
              ...prev,
              [activeDocumentId]: {
                  ...node,
                  data: { ...node.data, userKeywords: newKeywords }
              }
          };
      });
  };

  const addDocument = (nodeId: string, node: FileSystemNode, parentId?: string) => {
      setFileSystem(prev => {
          const next = { ...prev, [nodeId]: node };
          if (parentId && next[parentId]) {
              next[parentId] = {
                  ...next[parentId],
                  children: [...next[parentId].children, nodeId]
              };
          }
          return next;
      });
  };

  const addSection = () => {
      if (!activeDocumentId) return;
      setFileSystem(prev => {
          const node = prev[activeDocumentId];
          if (!node || !node.data) return prev;
          
          const newSectionId = uuidv4();
          const newSection = {
              id: newSectionId,
              title: { original: 'New Section', spanish: 'Nueva Sección' },
              summary: { original: 'Enter summary...', spanish: 'Ingrese resumen...' },
              content: { original: 'Enter content...', spanish: 'Ingrese contenido...' },
              icon: 'file-text',
              colorTheme: 'indigo' as const,
              keyPoints: { original: [], spanish: [] },
              isUserCreated: true,
              visuals: []
          };

          return {
              ...prev,
              [activeDocumentId]: {
                  ...node,
                  data: {
                      ...node.data,
                      sections: [...node.data.sections, newSection]
                  }
              }
          };
      });
  };

  const updateSection = (sectionId: string, updatedFields: any) => {
      if (!activeDocumentId) return;
      setFileSystem(prev => {
          const node = prev[activeDocumentId];
          if (!node || !node.data) return prev;

          const updatedSections = node.data.sections.map(sec => 
              sec.id === sectionId ? { ...sec, ...updatedFields } : sec
          );

          return {
              ...prev,
              [activeDocumentId]: {
                  ...node,
                  data: { ...node.data, sections: updatedSections }
              }
          };
      });
  };

  const updateDocumentData = (nodeId: string, data: ParsedDocument) => {
      setFileSystem(prev => ({
          ...prev,
          [nodeId]: { ...prev[nodeId], data }
      }));
  };

  return {
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
  };
};
