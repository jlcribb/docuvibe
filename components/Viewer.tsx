
import React, { useState, useEffect, useRef } from 'react';
import { ParsedDocument, Language, ScoringCriteria } from '../types';
import { SectionCard } from './SectionCard';
import { TimelineNav } from './TimelineNav';
import { DynamicIcon } from './Icons';
import { Tooltip } from './Tooltip';
import { ScoringPanel } from './ScoringPanel';
import { ChatPanel } from './ChatPanel';
import { ArrowLeft, Menu, X, Globe, Download, Save, MessageSquareText, Users, BookMarked, Share2, Calendar, Tag, Plus, Edit3, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewerProps {
  parsedDocument: ParsedDocument;
  onBack: () => void;
  onUpdateScoring: (newScoring: ScoringCriteria) => void;
  onUpdateKeywords: (keywords: string[]) => void;
  onOpenNetwork: () => void;
  onAddSection: () => void;
  onUpdateSection: (sectionId: string, data: any) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ 
    parsedDocument, 
    onBack, 
    onUpdateScoring, 
    onUpdateKeywords, 
    onOpenNetwork,
    onAddSection,
    onUpdateSection
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([parsedDocument.sections[0]?.id]));
  const [activeSectionId, setActiveSectionId] = useState<string>(parsedDocument.sections[0]?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [language, setLanguage] = useState<Language>('original');
  const [newKeyword, setNewKeyword] = useState('');
  
  // New State for Editing
  const [isEditing, setIsEditing] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const safeTitle = parsedDocument.title?.[language] || 'Untitled Document';
  const safeMainSummary = parsedDocument.mainSummary?.[language] || 'No summary available.';
  const authors = parsedDocument.authors || [];
  const references = parsedDocument.references || [];
  const publicationDate = parsedDocument.publicationDate;
  const keywords = parsedDocument.userKeywords || [];

  // Set up Intersection Observer to track active section
  useEffect(() => {
    const observerOptions = {
        root: scrollContainerRef.current,
        threshold: 0.1, 
        rootMargin: '-10% 0px -60% 0px' 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.id.replace('section-', '');
                setActiveSectionId(id);
            }
        });
    }, observerOptions);

    parsedDocument.sections.forEach((section) => {
        const el = document.getElementById(`section-${section.id}`);
        if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [parsedDocument.sections]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setOpenSections(prev => new Set(prev).add(id));
    const element = document.getElementById(`section-${id}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSectionId(id);
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
      e.preventDefault();
      if (newKeyword.trim()) {
          const updated = [...keywords, newKeyword.trim()];
          onUpdateKeywords(updated);
          setNewKeyword('');
      }
  };

  const handleRemoveKeyword = (keyword: string) => {
      const updated = keywords.filter(k => k !== keyword);
      onUpdateKeywords(updated);
  };

  const handleDownloadBackup = () => {
    try {
        const dataStr = JSON.stringify(parsedDocument, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${(parsedDocument.title?.original || 'backup').substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`;
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export failed", e);
    }
  };

  const tooltipText = {
    back: language === 'spanish' ? 'Volver al proyecto' : 'Back to project',
    toggleLangMobile: language === 'spanish' ? 'Cambiar idioma' : 'Switch language',
    save: language === 'spanish' ? 'Guardar Copia de Seguridad (JSON)' : 'Save Backup (JSON)',
    chat: language === 'spanish' ? 'Chat con el Documento' : 'Chat with Document',
    network: language === 'spanish' ? 'Analizar Red' : 'Analyze Network',
    edit: isEditing 
        ? (language === 'spanish' ? 'Salir de Edición' : 'Exit Edit Mode')
        : (language === 'spanish' ? 'Editar Documento' : 'Edit Document'),
    menu: mobileMenuOpen 
      ? (language === 'spanish' ? 'Cerrar menú' : 'Close menu')
      : (language === 'spanish' ? 'Abrir menú' : 'Open menu')
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center space-x-4">
          <Tooltip content={tooltipText.back} side="bottom">
            <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                aria-label={tooltipText.back}
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
          </Tooltip>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Document Viewer</div>
            <h1 className="text-lg font-bold text-slate-800 truncate max-w-[150px] md:max-w-md">
                {safeTitle}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
            
            <Tooltip content={tooltipText.edit} side="bottom">
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors border ${isEditing ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                >
                    {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    <span className="text-xs font-bold hidden sm:inline">
                        {isEditing ? (language === 'spanish' ? 'Ver' : 'View') : (language === 'spanish' ? 'Editar' : 'Edit')}
                    </span>
                </button>
            </Tooltip>

            <Tooltip content={tooltipText.network} side="bottom">
                <button
                    onClick={onOpenNetwork}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    <Share2 className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">
                        {language === 'spanish' ? 'Red' : 'Network'}
                    </span>
                </button>
            </Tooltip>

            <Tooltip content={tooltipText.chat} side="bottom">
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors border ${chatOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                >
                    <MessageSquareText className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">
                        Chat
                    </span>
                </button>
            </Tooltip>

            <Tooltip content={tooltipText.save} side="bottom">
                <button
                    onClick={handleDownloadBackup}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">
                        {language === 'spanish' ? 'Guardar' : 'Save'}
                    </span>
                </button>
            </Tooltip>

            <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" />

            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                    onClick={() => setLanguage('original')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${language === 'original' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Original
                </button>
                <button
                    onClick={() => setLanguage('spanish')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${language === 'spanish' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Español
                </button>
            </div>
            
            <div className="md:hidden">
                <Tooltip content={tooltipText.toggleLangMobile} side="bottom">
                    <button 
                        onClick={() => setLanguage(prev => prev === 'original' ? 'spanish' : 'original')}
                        className="p-2 text-slate-600 bg-slate-100 rounded-lg"
                    >
                        <Globe size={20} />
                    </button>
                </Tooltip>
            </div>

            <div className="md:hidden">
                <Tooltip content={tooltipText.menu} side="bottom">
                    <button 
                        className="p-2 text-slate-600"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </Tooltip>
            </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation - Desktop */}
        <div className="hidden md:block w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0 custom-scrollbar">
            <div className="p-6 pb-2">
                {/* Scoring Panel inside Sidebar */}
                {parsedDocument.scoring && (
                    <ScoringPanel 
                        scoring={parsedDocument.scoring}
                        onChange={onUpdateScoring}
                        language={language}
                    />
                )}

                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">
                    {language === 'spanish' ? 'Línea de Tiempo' : 'Timeline'}
                </h2>
            </div>
            
            <div className="px-4 pb-10">
                <TimelineNav 
                    sections={parsedDocument.sections}
                    activeSectionId={activeSectionId}
                    onSectionClick={scrollToSection}
                    language={language}
                />
            </div>
        </div>

        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
            {mobileMenuOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="absolute inset-0 bg-white z-10 p-6 md:hidden overflow-y-auto"
                >
                     {/* Mobile Scoring */}
                    {parsedDocument.scoring && (
                        <div className="mb-6">
                            <ScoringPanel 
                                scoring={parsedDocument.scoring}
                                onChange={onUpdateScoring}
                                language={language}
                            />
                        </div>
                    )}
                    
                    <h2 className="text-lg font-bold mb-6">
                        {language === 'spanish' ? 'Secciones' : 'Sections'}
                    </h2>
                    <div className="space-y-2">
                        {parsedDocument.sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="w-full flex items-center space-x-3 p-4 rounded-xl bg-slate-50 border border-slate-100"
                            >
                                <DynamicIcon name={section.icon} className="w-5 h-5 text-indigo-600" />
                                <span className="font-medium text-slate-800">{section.title?.[language] || 'Untitled'}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth transition-all duration-300" 
            id="scroll-container"
            style={{ marginRight: chatOpen ? '0' : '0' }}
        >
            <div className={`max-w-3xl mx-auto pb-20 transition-all duration-300 ${chatOpen ? 'md:mr-[400px] md:max-w-2xl' : ''}`}>
                
                {/* Metadata Card */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 mb-8 shadow-sm">
                    {/* Authors & Date & Keywords */}
                    <div className="flex flex-col gap-3 mb-4">
                        {authors.length > 0 && (
                            <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
                                <div className="flex items-center space-x-2 text-slate-500 shrink-0">
                                    <Users size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {language === 'spanish' ? 'Autores' : 'Authors'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {authors.map((author, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-bold border border-indigo-100">
                                            {author}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {publicationDate && (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 self-start">
                                <div className="flex items-center space-x-2 text-slate-500 shrink-0">
                                    <Calendar size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {language === 'spanish' ? 'Fecha Pub.' : 'Pub. Date'}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-slate-800">
                                    {publicationDate}
                                </span>
                            </div>
                        )}
                        
                        {/* KEYWORDS / TAGS SECTION */}
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                            <div className="flex items-center space-x-2 text-slate-500 mb-2">
                                <Tag size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {language === 'spanish' ? 'Palabras Clave / Tags' : 'Keywords / Tags'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {keywords.map((kw, i) => (
                                    <span key={i} className="flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200">
                                        <span>{kw}</span>
                                        <button onClick={() => handleRemoveKeyword(kw)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                    </span>
                                ))}
                                {keywords.length === 0 && <span className="text-xs text-slate-400 italic">No tags added.</span>}
                            </div>
                            <form onSubmit={handleAddKeyword} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={newKeyword} 
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    placeholder={language === 'spanish' ? 'Agregar tag...' : 'Add tag...'}
                                    className="text-xs p-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-300 w-32"
                                />
                                <button type="submit" disabled={!newKeyword.trim()} className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 disabled:opacity-50">
                                    <Plus size={14} />
                                </button>
                            </form>
                        </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">
                        {language === 'spanish' ? 'Resumen Ejecutivo' : 'Executive Summary'}
                    </h3>
                    
                    <p className="text-sm md:text-base text-slate-600 leading-relaxed font-serif italic mb-6">
                        {safeMainSummary}
                    </p>

                    {/* References Section */}
                    {references.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <button 
                                onClick={() => setShowReferences(!showReferences)}
                                className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <BookMarked size={16} />
                                <span>
                                    {showReferences 
                                        ? (language === 'spanish' ? 'Ocultar Referencias' : 'Hide References')
                                        : (language === 'spanish' ? `Ver ${references.length} Referencias` : `View ${references.length} References`)
                                    }
                                </span>
                            </button>
                            
                            <AnimatePresence>
                                {showReferences && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 pl-2">
                                            <ul className="space-y-2">
                                                {references.map((ref, i) => (
                                                    <li key={i} className="flex items-start space-x-2 text-xs text-slate-600">
                                                        <span className="text-slate-300 shrink-0">•</span>
                                                        <span>{ref}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {parsedDocument.sections.map((section, index) => (
                    <div id={`section-${section.id}`} key={section.id} className="scroll-mt-6">
                        <SectionCard
                            section={section}
                            index={index}
                            isOpen={openSections.has(section.id)}
                            onToggle={() => toggleSection(section.id)}
                            language={language}
                            fileData={parsedDocument.fileData}
                            isEditing={isEditing}
                            onUpdateSection={onUpdateSection}
                        />
                    </div>
                ))}

                {/* Add Section Button */}
                {isEditing && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={onAddSection}
                        className="w-full mt-8 py-4 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center space-x-2 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium"
                    >
                        <Plus size={20} />
                        <span>{language === 'spanish' ? 'Agregar Nueva Sección' : 'Add New Section'}</span>
                    </motion.button>
                )}
            </div>
        </div>

        {/* Chat Panel */}
        <ChatPanel 
            document={parsedDocument}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  );
};
