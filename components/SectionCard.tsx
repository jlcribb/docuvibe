
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, Check, Printer, Minimize2, BarChart3, Plus, Image as ImageIcon, Music, Type, Trash2, PlusCircle } from 'lucide-react';
import { DocumentSection, Language, VisualAsset } from '../types';
import { DynamicIcon } from './Icons';
import { VisualsModal } from './VisualsModal';
import { v4 as uuidv4 } from 'uuid';

interface SectionCardProps {
  section: DocumentSection;
  index: number;
  isOpen: boolean;
  language: Language;
  onToggle: () => void;
  fileData?: string;
  isEditing?: boolean;
  onUpdateSection?: (sectionId: string, data: any) => void;
}

const iconBgStyles = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
};

export const SectionCard: React.FC<SectionCardProps> = ({ 
    section, index, isOpen, language, onToggle, fileData, isEditing, onUpdateSection 
}) => {
  const [showFullText, setShowFullText] = useState(false);
  const [showVisualsModal, setShowVisualsModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [newKeyPoint, setNewKeyPoint] = useState('');
  
  const iconTheme = iconBgStyles[section.colorTheme] || iconBgStyles.blue;
  
  const title = section.title?.[language] || 'Untitled Section';
  const summary = section.summary?.[language] || 'No summary available.';
  const content = section.content?.[language] || 'No content available.';
  const keyPoints = section.keyPoints?.[language] || [];
  
  const hasVisuals = section.visuals && section.visuals.length > 0;
  const customItems = (section as any).customItems || [];

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    const contentToPrint = showFullText ? content : summary;
    const titleToPrint = showFullText ? `${title} - Full Text` : `${title} - Summary`;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>${titleToPrint}</title>
        <style>body { font-family: sans-serif; padding: 40px; }</style>
        </head><body><h1>${titleToPrint}</h1><div class="content">${contentToPrint}</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>`);
      printWindow.document.close();
    }
  };

  const handleAddText = () => {
      if (newText.trim() && onUpdateSection) {
          const updatedItems = [...customItems, newText.trim()];
          onUpdateSection(section.id, { customItems: updatedItems });
          setNewText('');
          setIsAddingText(false);
      }
  };

  const handleUpdateTitle = (newVal: string) => {
      if (onUpdateSection) {
          onUpdateSection(section.id, { 
              title: { ...section.title, [language]: newVal } 
          });
      }
  };

  const handleUpdateSummary = (newVal: string) => {
      if (onUpdateSection) {
          onUpdateSection(section.id, { 
              summary: { ...section.summary, [language]: newVal } 
          });
      }
  };

  const handleAddKeyPoint = () => {
      if (newKeyPoint.trim() && onUpdateSection) {
          const updatedPoints = [...keyPoints, newKeyPoint.trim()];
          onUpdateSection(section.id, {
              keyPoints: { ...section.keyPoints, [language]: updatedPoints }
          });
          setNewKeyPoint('');
      }
  };

  const handleRemoveKeyPoint = (indexToRemove: number) => {
      if (onUpdateSection) {
          const updatedPoints = keyPoints.filter((_, i) => i !== indexToRemove);
          onUpdateSection(section.id, {
              keyPoints: { ...section.keyPoints, [language]: updatedPoints }
          });
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image_reference' | 'audio') => {
      if (e.target.files && e.target.files[0] && onUpdateSection) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = () => {
              // Store full Data URL for immediate display/playback
              const dataUrl = reader.result as string; 
              
              const newAsset: VisualAsset = {
                  id: uuidv4(),
                  type: type,
                  title: { original: file.name, spanish: file.name },
                  content: dataUrl, 
                  pageNumber: 0
              };
              
              const updatedVisuals = [...(section.visuals || []), newAsset];
              onUpdateSection(section.id, { visuals: updatedVisuals });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <>
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`mb-6 rounded-2xl border ${isOpen ? 'shadow-lg border-slate-300' : 'shadow-sm border-slate-200'} bg-white overflow-hidden`}
    >
      <div
        onClick={onToggle}
        className={`w-full cursor-pointer flex items-center justify-between p-6 transition-all duration-300 ${isOpen ? 'bg-white' : 'hover:bg-slate-50'}`}
      >
        <div className="flex items-center space-x-4 text-left flex-1 mr-4">
          <div className={`p-3 rounded-xl ${iconTheme}`}>
            <DynamicIcon name={section.icon || 'file-text'} className="w-6 h-6" />
          </div>
          <div className="flex-1">
            {isEditing && isOpen ? (
                <input 
                    type="text"
                    value={title}
                    onChange={(e) => handleUpdateTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xl font-bold text-slate-800 w-full border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                />
            ) : (
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            )}
            
            {!isOpen && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1 italic">{summary}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
             {hasVisuals && !isOpen && (
                 <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-500">
                    <BarChart3 size={14} />
                    <span className="hidden sm:inline">{section.visuals?.length}</span>
                 </div>
             )}
            <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
            <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.5 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-8 pt-2">
                
                {/* Control Bar */}
                <div className="flex flex-wrap gap-4 items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={() => setShowFullText(false)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${!showFullText ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                         >
                            {language === 'spanish' ? 'Resumen' : 'Summary'}
                         </button>
                         <button 
                            onClick={() => setShowFullText(true)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${showFullText ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                         >
                            {language === 'spanish' ? 'Texto Completo' : 'Full Text'}
                         </button>
                         
                         {hasVisuals && (
                            <button 
                                onClick={() => setShowVisualsModal(true)}
                                className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                            >
                                <BarChart3 size={14} />
                                <span>
                                    {language === 'spanish' ? 'Ver Gráficos/Tablas' : 'View Charts/Data'}
                                </span>
                            </button>
                         )}
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <Printer size={18} />
                    </button>
                </div>

                {/* EDIT MODE TOOLBAR */}
                {isEditing && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 flex gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg"
                    >
                        <button 
                            onClick={() => setIsAddingText(true)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-200 rounded text-xs font-bold text-amber-700 hover:bg-amber-100"
                        >
                            <Type size={14} /> <span>Text</span>
                        </button>
                        <label className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-200 rounded text-xs font-bold text-amber-700 hover:bg-amber-100 cursor-pointer">
                            <ImageIcon size={14} /> <span>Image</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image_reference')} />
                        </label>
                        <label className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-200 rounded text-xs font-bold text-amber-700 hover:bg-amber-100 cursor-pointer">
                            <Music size={14} /> <span>Audio</span>
                            <input type="file" className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} />
                        </label>
                    </motion.div>
                )}

                {/* Add Text Input */}
                {isAddingText && (
                    <div className="mb-4 p-3 bg-white border border-indigo-200 rounded-lg shadow-sm">
                        <textarea 
                            autoFocus
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            className="w-full text-sm p-2 border-b border-slate-100 focus:outline-none resize-none"
                            placeholder="Type your content here..."
                            rows={3}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button onClick={() => setIsAddingText(false)} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                            <button onClick={handleAddText} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md">Add</button>
                        </div>
                    </div>
                )}

                {/* User Added Items (Custom Items) */}
                {customItems.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {customItems.map((item: string, i: number) => (
                            <div key={i} className="p-3 bg-yellow-50 border-l-4 border-yellow-300 rounded-r text-sm text-slate-700 relative group">
                                {item}
                                {isEditing && (
                                    <button 
                                        onClick={() => {
                                            const updatedItems = customItems.filter((_: any, idx: number) => idx !== i);
                                            if (onUpdateSection) onUpdateSection(section.id, { customItems: updatedItems });
                                        }}
                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="min-h-[200px]">
                    <AnimatePresence mode="wait">
                        {!showFullText ? (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-slate-50 border-l-4 border-slate-400 p-6 rounded-r-lg">
                                    <h4 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-3">
                                        {language === 'spanish' ? 'Resumen Ejecutivo' : 'Executive Summary'}
                                    </h4>
                                    {isEditing ? (
                                        <textarea 
                                            value={summary}
                                            onChange={(e) => handleUpdateSummary(e.target.value)}
                                            className="w-full bg-white p-2 border border-slate-200 rounded text-lg leading-relaxed text-slate-700 font-serif italic focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            rows={4}
                                        />
                                    ) : (
                                        <p className="text-lg leading-relaxed text-slate-700 font-serif italic">
                                            "{summary}"
                                        </p>
                                    )}
                                </div>
                                <div className="mt-8">
                                    {keyPoints && keyPoints.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                            {keyPoints.map((point, i) => (
                                                <div key={i} className="group flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors relative">
                                                    <div className="mt-1 bg-slate-200 rounded-full p-0.5 shrink-0">
                                                        <Check className="w-3 h-3 text-slate-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-700 flex-1">{point}</span>
                                                    {isEditing && (
                                                        <button 
                                                            onClick={() => handleRemoveKeyPoint(i)}
                                                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white rounded shadow-sm"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {isEditing && (
                                        <div className="flex gap-2 items-center mt-2 max-w-md">
                                            <input 
                                                type="text" 
                                                value={newKeyPoint}
                                                onChange={(e) => setNewKeyPoint(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyPoint()}
                                                placeholder="Add new topic/item..."
                                                className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                            />
                                            <button 
                                                onClick={handleAddKeyPoint}
                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                <PlusCircle size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="fulltext"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-indigo-600">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                </div>
                                
                                <div className="mt-8 flex justify-center">
                                    <button 
                                        onClick={() => setShowFullText(false)}
                                        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Minimize2 size={16} />
                                        <span>{language === 'spanish' ? 'Volver al resumen' : 'Back to summary'}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVisualsModal && section.visuals && (
            <VisualsModal 
                visuals={section.visuals} 
                language={language}
                onClose={() => setShowVisualsModal(false)}
                fileData={fileData}
            />
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
};
