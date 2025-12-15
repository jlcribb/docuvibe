import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2, FileType } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onFileSelect, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">DocuVibe</h1>
          <p className="text-slate-500">Transform your papers into interactive experiences</p>
        </div>

        <div
          className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out bg-white
            ${dragActive ? 'border-indigo-500 bg-indigo-50 shadow-xl' : 'border-slate-300 hover:border-slate-400 hover:shadow-lg'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleChange}
            accept=".txt,.md,.pdf"
            disabled={isProcessing}
          />
          
          <div className="flex flex-col items-center pointer-events-none">
            {isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-lg font-medium text-slate-700">Analyzing Document...</p>
                <p className="text-sm text-slate-400 mt-2">Powered by Gemini 2.5 Flash</p>
              </>
            ) : (
              <>
                <div className={`p-4 rounded-full mb-4 ${dragActive ? 'bg-indigo-200' : 'bg-slate-100'}`}>
                   <Upload className={`w-8 h-8 ${dragActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                </div>
                <p className="text-lg font-medium text-slate-700">Drop your file here</p>
                <p className="text-sm text-slate-400 mt-2">Support for PDF, TXT, Markdown</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FileType size={20}/></div>
                <div className="text-xs text-slate-600 font-medium">Automatic Structure Detection</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><FileText size={20}/></div>
                <div className="text-xs text-slate-600 font-medium">Smart Summarization</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Loader2 size={20}/></div>
                <div className="text-xs text-slate-600 font-medium">Real-time Visualization</div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
