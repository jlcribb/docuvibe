
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Folder, FileText, ChevronRight, ChevronDown, Plus, Upload, Trash2, Home, 
    Share2, Save, Copy, Edit2, Palette, LayoutGrid, X, FolderOpen, Move
} from 'lucide-react';
import { FileSystemNode, NodeType } from '../types';
import { DynamicIcon } from './Icons';

interface ProjectExplorerProps {
  fileSystem: Record<string, FileSystemNode>;
  currentPath: string[]; 
  onNavigate: (nodeId: string | null) => void;
  onCreateFolder: (name: string, type: NodeType) => void;
  onDeleteNode: (id: string) => void;
  onOpenFile: (nodeId: string) => void;
  onFileUpload: (file: File) => void;
  onOpenNetwork: () => void;
  onSaveProject?: () => void;
  onLoadProject?: (file: File) => void;
  onMoveNode?: (nodeId: string, newParentId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRenameNode?: (nodeId: string, newName: string) => void;
  onUpdateVisuals?: (nodeId: string, icon: string, color: string) => void;
  isProcessing: boolean;
}

// ... (SidebarTreeNode kept simple for brevity, assume same logic as before)
// Re-implementing SidebarTreeNode to ensure file completeness
const SidebarTreeNode: React.FC<any> = ({ nodeId, level, fileSystem, currentPath, onNavigate, onMoveNode }) => {
    const node = fileSystem[nodeId];
    const [isCollapsed, setIsCollapsed] = useState(false);
    const isActive = currentPath[currentPath.length - 1] === nodeId;
    const [isDragOver, setIsDragOver] = useState(false);
    
    const folderChildren = (node?.children || []).filter((childId: string) => fileSystem[childId]?.type !== 'document_folder');
    const hasChildren = folderChildren.length > 0;

    if (!node || node.type === 'document_folder') return null;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('nodeId');
        if (draggedId && draggedId !== nodeId && onMoveNode) onMoveNode(draggedId, nodeId);
    };

    return (
        <div className="select-none">
            <div 
                className={`flex items-center py-1.5 px-2 mx-2 rounded-lg cursor-pointer transition-colors text-sm mb-0.5 border border-transparent
                    ${isActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}
                    ${isDragOver ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : ''}
                `}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onNavigate(nodeId)}
                onDragOver={(e) => {e.preventDefault(); setIsDragOver(true);}}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <button 
                    className={`p-0.5 mr-1 rounded hover:bg-slate-200 ${hasChildren ? 'text-slate-400' : 'opacity-0'}`}
                    onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <div className={`mr-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {node.icon ? <DynamicIcon name={node.icon} size={16} /> : <Folder size={16} />}
                </div>
                <span className="truncate">{node.name}</span>
            </div>
            {!isCollapsed && hasChildren && (
                <div>
                    {folderChildren.map((childId: string) => (
                        <SidebarTreeNode key={childId} nodeId={childId} level={level + 1} fileSystem={fileSystem} currentPath={currentPath} onNavigate={onNavigate} onMoveNode={onMoveNode} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  fileSystem, currentPath, onNavigate, onCreateFolder, onDeleteNode, onOpenFile, onFileUpload, onOpenNetwork, 
  onSaveProject, onMoveNode, onDuplicateNode, onRenameNode, onUpdateVisuals, isProcessing
}) => {
  const [organizeMode, setOrganizeMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [customizingNodeId, setCustomizingNodeId] = useState<string | null>(null);

  const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
  const rootNodes = (Object.values(fileSystem) as FileSystemNode[]).filter(node => node.parentId === null);
  const currentChildrenIds = currentFolderId ? (fileSystem[currentFolderId]?.children || []) : rootNodes.map(n => n.id);
  const totalDocuments = (Object.values(fileSystem) as FileSystemNode[]).filter(n => n.type === 'document_folder').length;

  const getNextType = (): NodeType | null => {
    const activeNode = currentFolderId ? fileSystem[currentFolderId] : null;
    const type = activeNode ? activeNode.type : 'root';
    if (type === 'root') return 'project';
    if (type === 'project') return 'section';
    return 'subsection';
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const type = getNextType();
    if (newFolderName.trim() && type) {
      onCreateFolder(newFolderName, type);
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
          <div className="p-4 border-b border-slate-200 flex items-center space-x-2">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg"><LayoutGrid size={16} /></div>
              <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <div className={`px-4 py-2 mb-2 flex items-center space-x-2 cursor-pointer hover:bg-slate-100 mx-2 rounded-lg ${!currentFolderId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`} onClick={() => onNavigate(null)}>
                  <Home size={16} /> <span className="text-sm font-bold">Home</span>
              </div>
              {rootNodes.map(node => <SidebarTreeNode key={node.id} nodeId={node.id} level={0} fileSystem={fileSystem} currentPath={currentPath} onNavigate={onNavigate} onMoveNode={onMoveNode} />)}
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-100/50">
              <div className="flex justify-between text-xs text-slate-500 mb-3"><span>{totalDocuments} Docs</span></div>
              {onSaveProject && (
                  <button onClick={onSaveProject} className="w-full flex justify-center space-x-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-sm">
                      <Save size={14} /> <span>Save Workspace</span>
                  </button>
              )}
          </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar mr-4">
                  <button onClick={() => onNavigate(null)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Home size={18} /></button>
                  {currentPath.map((nodeId, index) => {
                      const node = fileSystem[nodeId];
                      if (!node) return null;
                      return <div key={nodeId} className="flex items-center shrink-0"><ChevronRight size={14} className="text-slate-300 mx-1" /><button onClick={() => onNavigate(nodeId)} className="px-2 py-1 rounded-md text-sm font-medium hover:bg-slate-50 text-slate-600">{node.name}</button></div>;
                  })}
              </div>
              <div className="flex items-center space-x-2">
                  <button onClick={() => setOrganizeMode(!organizeMode)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${organizeMode ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-white border border-slate-200 text-slate-500'}`}>
                      <Move size={14} /> <span>{organizeMode ? 'Done' : 'Organize'}</span>
                  </button>
                  {totalDocuments > 0 && <button onClick={onOpenNetwork} className="p-2 text-slate-500 hover:text-indigo-600 bg-indigo-50 rounded-lg"><Share2 size={20} /></button>}
                  <button onClick={() => setIsCreating(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md"><Plus size={18} /><span className="hidden sm:inline">New</span></button>
              </div>
          </div>

          {/* Create Input */}
          <AnimatePresence>{isCreating && (
              <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreate} className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center gap-3 overflow-hidden">
                <input autoFocus type="text" placeholder="Folder Name..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="flex-1 px-4 py-2 border border-indigo-200 rounded-lg" />
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Create</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500">Cancel</button>
              </motion.form>
          )}</AnimatePresence>

          {/* Grid */}
          <div className={`flex-1 overflow-y-auto p-6 ${dragActive ? 'bg-indigo-50/30' : 'bg-slate-50/30'}`} onDragOver={e => {e.preventDefault(); setDragActive(true);}} onDrop={e => {e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) onFileUpload(e.dataTransfer.files[0]);}}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                  {currentChildrenIds.map(childId => {
                      const node = fileSystem[childId];
                      if (!node) return null;
                      const isDoc = node.type === 'document_folder';
                      const isEditing = editingNodeId === childId;
                      
                      return (
                          <motion.div 
                            key={childId} layout 
                            draggable={organizeMode}
                            onDragStart={e => { if(organizeMode) e.dataTransfer.setData('nodeId', childId); }}
                            onDragOver={e => { if(organizeMode && !isDoc) { e.preventDefault(); } }}
                            onDrop={e => { if(organizeMode && !isDoc && onMoveNode) { e.preventDefault(); const src = e.dataTransfer.getData('nodeId'); if(src !== childId) onMoveNode(src, childId); } }}
                            className={`relative group flex flex-col p-5 rounded-2xl border transition-all duration-200 bg-white ${organizeMode ? 'border-dashed border-slate-300 cursor-grab active:cursor-grabbing hover:border-indigo-400' : 'border-slate-200 hover:shadow-lg cursor-pointer'}`}
                            onClick={() => !isEditing && !organizeMode && (isDoc ? onOpenFile(childId) : onNavigate(childId))}
                          >
                              <div className="flex justify-between items-start mb-4">
                                  <div className={`p-3 rounded-xl ${node.color ? `bg-${node.color}-100 text-${node.color}-600` : (isDoc ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600')}`}>
                                      <DynamicIcon name={node.icon || (isDoc ? 'file-text' : 'folder')} className="w-6 h-6" />
                                  </div>
                              </div>
                              {isEditing ? (
                                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => {if(e.key==='Enter' && onRenameNode){onRenameNode(childId, editName); setEditingNodeId(null);}}} onBlur={() => setEditingNodeId(null)} className="w-full p-1 border rounded" onClick={e => e.stopPropagation()} />
                              ) : (
                                  <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{node.name}</h3>
                              )}
                              
                              {/* Actions: Always visible in Organize Mode, or on Hover in Normal Mode */}
                              <div className={`mt-auto flex justify-between pt-3 border-t border-slate-100 transition-opacity duration-200 ${organizeMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                      <button onClick={() => {setEditingNodeId(childId); setEditName(node.name);}} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={14}/></button>
                                      <button onClick={() => setCustomizingNodeId(childId)} className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded"><Palette size={14}/></button>
                                      {onDuplicateNode && <button onClick={() => onDuplicateNode(childId)} className="p-1.5 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded"><Copy size={14}/></button>}
                                  </div>
                                  <button onClick={() => onDeleteNode(childId)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14}/></button>
                              </div>
                          </motion.div>
                      );
                  })}
                  {/* Upload Card */}
                  {!organizeMode && (
                      <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-all group min-h-[180px]">
                          <input type="file" className="hidden" onChange={e => e.target.files?.[0] && onFileUpload(e.target.files[0])} disabled={isProcessing} accept=".pdf,.txt,.md,.json" />
                          <div className="p-3 bg-white border border-slate-200 rounded-full mb-3 group-hover:scale-110 transition-transform shadow-sm text-indigo-600"><Upload size={20} /></div>
                          <span className="text-sm font-bold text-slate-600">Upload Document</span>
                      </label>
                  )}
              </div>
          </div>
      </div>
      {/* Customization Modal */}
      <AnimatePresence>
          {customizingNodeId && onUpdateVisuals && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setCustomizingNodeId(null)}>
                  <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold mb-4">Customize</h3>
                      <div className="flex flex-wrap gap-3 mb-6">
                          {['blue', 'green', 'purple', 'orange', 'red', 'indigo', 'pink'].map(c => <button key={c} onClick={() => { onUpdateVisuals(customizingNodeId, fileSystem[customizingNodeId]?.icon || '', c); setCustomizingNodeId(null); }} className={`w-8 h-8 rounded-full bg-${c}-500 ring-offset-2 hover:ring-2 ring-${c}-300`} />)}
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                          {['folder', 'book', 'star', 'target', 'zap', 'code'].map(i => <button key={i} onClick={() => { onUpdateVisuals(customizingNodeId, i, fileSystem[customizingNodeId]?.color || ''); setCustomizingNodeId(null); }} className="p-2 bg-slate-50 hover:bg-indigo-100 rounded"><DynamicIcon name={i} size={18}/></button>)}
                      </div>
                  </div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};
