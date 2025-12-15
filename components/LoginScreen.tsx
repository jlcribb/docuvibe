
import React from 'react';
import { HardDrive, ShieldAlert, LogIn, UserCircle, FolderPlus, FolderCheck } from 'lucide-react';
import { FileSystemNode } from '../types';

interface LoginScreenProps {
  isConfigConfigured: boolean;
  driveInited: boolean;
  isSelectingRoot: boolean;
  isLoadingRoots: boolean;
  rootCandidates: FileSystemNode[];
  onLogin: () => void;
  onGuestLogin: () => void;
  onLoadWorkspace: (file: File) => void;
  onCreateDefaultRoot: () => void;
  onSelectRoot: (folder: FileSystemNode) => void;
  onCancelRootSelection: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isConfigConfigured,
  driveInited,
  isSelectingRoot,
  isLoadingRoots,
  rootCandidates,
  onLogin,
  onGuestLogin,
  onLoadWorkspace,
  onCreateDefaultRoot,
  onSelectRoot,
  onCancelRootSelection
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-indigo-100 rounded-full text-indigo-600">
              <HardDrive size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">DocuVibe</h1>

          {!isSelectingRoot ? (
            <>
              <p className="text-slate-500 mb-8">Transform your papers into interactive experiences.</p>

              {!isConfigConfigured && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-left mb-6 flex items-start space-x-3">
                  <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Google Drive sync unavailable (API Keys missing). You can still use Guest Mode to visualize documents.</p>
                </div>
              )}

              <div className="space-y-3">
                {isConfigConfigured && (
                  <button 
                    onClick={onLogin} 
                    disabled={!driveInited} 
                    className="w-full flex items-center justify-center space-x-3 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {driveInited ? (
                      <>
                        <LogIn size={20} />
                        <span>Sign in with Google</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        <span>Initializing...</span>
                      </>
                    )}
                  </button>
                )}

                <button onClick={onGuestLogin} className="w-full flex items-center justify-center space-x-3 py-3 px-6 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-all">
                  <UserCircle size={20} />
                  <span>Continue as Guest (Local)</span>
                </button>

                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-slate-400 uppercase">Or load existing</span>
                  </div>
                </div>

                <label className="w-full flex items-center justify-center space-x-3 py-3 px-6 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 border-dashed rounded-xl font-medium transition-all cursor-pointer">
                  <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onLoadWorkspace(e.target.files[0])} />
                  <FolderPlus size={18} />
                  <span>Load Local Workspace JSON</span>
                </label>
              </div>
            </>
          ) : (
            <div className="text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Select Root Folder</h2>
              <button onClick={onCreateDefaultRoot} className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-4 hover:bg-indigo-100 transition-colors group" disabled={isLoadingRoots}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-200 text-indigo-700 rounded-lg"><FolderPlus size={20} /></div>
                  <div className="text-left">
                    <div className="font-bold text-indigo-900">Create "DocuVibe Projects"</div>
                    <div className="text-xs text-indigo-600">Recommended for new users</div>
                  </div>
                </div>
              </button>

              <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50">
                {isLoadingRoots ? (
                  <div className="p-4 text-center text-slate-400">Loading folders...</div>
                ) : rootCandidates.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No folders found in root.</div>
                ) : (
                  rootCandidates.map(folder => (
                    <button key={folder.id} onClick={() => onSelectRoot(folder)} className="w-full flex items-center space-x-3 p-3 hover:bg-white border-b border-slate-100 last:border-0 transition-colors">
                      <FolderCheck className="text-slate-400" size={18} />
                      <span className="text-sm text-slate-700 truncate">{folder.name}</span>
                    </button>
                  ))
                )}
              </div>
              <button onClick={onCancelRootSelection} className="mt-4 w-full py-2 text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-8 text-center text-xs text-slate-400">@ 2025 jlCribbLibardi</footer>
    </div>
  );
};
