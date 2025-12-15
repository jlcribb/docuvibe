import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  side = 'bottom' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: '-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-1',
    bottom: '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-1',
    left: '-left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-1',
    right: '-right-2 top-1/2 -translate-y-1/2 translate-x-full ml-1',
  };

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg shadow-xl whitespace-nowrap pointer-events-none ${positionClasses[side]}`}
          >
            {content}
            {/* Tiny arrow using CSS borders */}
            <div 
                className={`absolute w-0 h-0 border-4 border-transparent 
                ${side === 'top' ? 'border-t-slate-800 top-full left-1/2 -translate-x-1/2' : ''}
                ${side === 'bottom' ? 'border-b-slate-800 bottom-full left-1/2 -translate-x-1/2' : ''}
                ${side === 'left' ? 'border-l-slate-800 left-full top-1/2 -translate-y-1/2' : ''}
                ${side === 'right' ? 'border-r-slate-800 right-full top-1/2 -translate-y-1/2' : ''}
                `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};