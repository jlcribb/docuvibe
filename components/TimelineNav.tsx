import React from 'react';
import { motion } from 'framer-motion';
import { DocumentSection, Language } from '../types';
import { DynamicIcon } from './Icons';

interface TimelineNavProps {
  sections: DocumentSection[];
  activeSectionId: string;
  onSectionClick: (id: string) => void;
  language: Language;
}

const themeColors: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
};

const themeTextColors: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  indigo: 'text-indigo-600',
};

export const TimelineNav: React.FC<TimelineNavProps> = ({ 
  sections, 
  activeSectionId, 
  onSectionClick,
  language 
}) => {
  return (
    <div className="relative pl-2 py-2">
      {/* Continuous Vertical Line */}
      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200" />

      <div className="space-y-6 relative">
        {sections.map((section, index) => {
          const isActive = activeSectionId === section.id;
          const isPast = sections.findIndex(s => s.id === activeSectionId) > index;
          const colorClass = themeColors[section.colorTheme] || 'bg-indigo-500';
          const textClass = themeTextColors[section.colorTheme] || 'text-indigo-600';

          return (
            <div 
              key={section.id}
              className="group relative flex items-start cursor-pointer"
              onClick={() => onSectionClick(section.id)}
            >
              {/* Timeline Node */}
              <div className="relative z-10 flex items-center justify-center w-10 h-10 shrink-0">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    backgroundColor: isActive || isPast ? 'white' : '#f1f5f9', // slate-100
                    borderColor: isActive || isPast ? 'currentColor' : 'transparent',
                  }}
                  className={`w-4 h-4 rounded-full border-2 transition-colors duration-300 ${isActive || isPast ? textClass : 'border-slate-300'}`}
                >
                   {isActive && (
                     <motion.div 
                        layoutId="active-glow"
                        className={`absolute inset-0 rounded-full opacity-20 ${colorClass}`} 
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 2.5 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                     />
                   )}
                </motion.div>
                
                {/* Connector overlay for active state to hide line behind node */}
                <div className="absolute w-2 h-2 rounded-full bg-white z-0" />
              </div>

              {/* Label Content */}
              <div className="flex-1 pt-2 pl-2">
                <div className="flex items-center space-x-2">
                    <span 
                        className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${isActive ? textClass : 'text-slate-400 group-hover:text-slate-600'}`}
                    >
                        {language === 'spanish' ? 'Sección' : 'Section'} {index + 1}
                    </span>
                    {isActive && (
                        <motion.div 
                            initial={{ opacity: 0, x: -5 }} 
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-100 text-slate-500 text-[10px] px-1.5 rounded-md"
                        >
                           {language === 'spanish' ? 'Leyendo' : 'Reading'}
                        </motion.div>
                    )}
                </div>
                
                <h4 
                    className={`text-sm font-medium leading-tight transition-all duration-200 mt-1 ${isActive ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}
                >
                    {section.title?.[language] || 'Untitled'}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};