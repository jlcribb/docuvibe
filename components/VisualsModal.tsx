
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, BarChart3, PieChart, Table as TableIcon, Image as ImageIcon, GitMerge, FileQuestion, ZoomIn, Music } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { VisualAsset, Language } from '../types';
import mermaid from 'mermaid';
import * as pdfjsLib from 'pdfjs-dist';

// Define worker source for PDF.js safely
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    } catch (e) {
        console.warn("Failed to set PDF worker source", e);
    }
}

interface VisualsModalProps {
  visuals: VisualAsset[];
  language: Language;
  onClose: () => void;
  fileData?: string;
}

// Internal component for safe Mermaid rendering
const MermaidRenderer: React.FC<{ code: string }> = ({ code }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    
    // Simple sanitizer to remove problematic characters from node labels
    const sanitizeMermaid = (input: string) => {
        // Replace parentheses () with brackets [] in labels to prevent syntax errors
        // Matches content inside label brackets [] or quotes "" is tricky in regex, 
        // so we basically just target likely text parts.
        // A simple heuristic: remove ( ) that are not part of function calls (which mermaid doesn't strictly use in text)
        return input.replace(/\((.*?)\)/g, '[$1]'); 
    };

    useEffect(() => {
        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Inter, sans-serif'
        });

        const renderDiagram = async () => {
            try {
                // Unique ID for this render to prevent collisions
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const cleanCode = sanitizeMermaid(code);
                // Attempt to render
                const { svg } = await mermaid.render(id, cleanCode);
                setSvg(svg);
                setError(false);
            } catch (e) {
                console.error("Mermaid Render Error:", e);
                setError(true);
            }
        };

        if (code) {
            renderDiagram();
        }
    }, [code]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-mono border border-red-200">
                Failed to render diagram. Code syntax might be invalid.
                <pre className="mt-2 text-xs text-slate-500 overflow-x-auto">{code}</pre>
            </div>
        );
    }

    if (!svg) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl" />;

    return (
        <div 
            className="w-full flex justify-center overflow-x-auto p-4 bg-white rounded-xl"
            dangerouslySetInnerHTML={{ __html: svg }} 
        />
    );
};

// Internal component to render PDF page and optionally crop
const PDFPageRenderer: React.FC<{ fileData: string, pageNumber: number, boundingBox?: number[] }> = ({ fileData, pageNumber, boundingBox }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const renderPage = async () => {
            if (!canvasRef.current || !fileData) return;
            setLoading(true);
            try {
                // Convert base64 to Uint8Array
                const pdfData = atob(fileData);
                const array = new Uint8Array(pdfData.length);
                for (let i = 0; i < pdfData.length; i++) {
                    array[i] = pdfData.charCodeAt(i);
                }

                const loadingTask = pdfjsLib.getDocument({ data: array });
                const pdf = await loadingTask.promise;
                
                // Fetch the page
                // Gemini page numbers are usually 1-based, pdfjs uses 1-based for getPage
                const page = await pdf.getPage(pageNumber || 1);
                
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    } as any).promise;

                    // If Bounding Box is provided [ymin, xmin, ymax, xmax] (0-1 coords)
                    if (boundingBox && boundingBox.length === 4) {
                        const [ymin, xmin, ymax, xmax] = boundingBox;
                        
                        // Calculate crop coordinates
                        const sx = xmin * canvas.width;
                        const sy = ymin * canvas.height;
                        const sWidth = (xmax - xmin) * canvas.width;
                        const sHeight = (ymax - ymin) * canvas.height;

                        // Create a temporary canvas for the cropped image
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = sWidth;
                        tempCanvas.height = sHeight;
                        const tempCtx = tempCanvas.getContext('2d');
                        
                        if (tempCtx) {
                            // Draw the cropped region to temp canvas
                            tempCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                            
                            // Resize original canvas to match crop and draw back
                            canvas.width = sWidth;
                            canvas.height = sHeight;
                            context.drawImage(tempCanvas, 0, 0);
                        }
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("PDF Render Error:", err);
                setError("Failed to render the document page.");
                setLoading(false);
            }
        };

        renderPage();
    }, [fileData, pageNumber, boundingBox]);

    if (error) return <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="relative w-full overflow-hidden bg-slate-100 rounded-lg border border-slate-200 flex justify-center">
             {loading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
                 </div>
             )}
            <canvas ref={canvasRef} className="max-w-full h-auto shadow-sm" />
        </div>
    );
};


export const VisualsModal: React.FC<VisualsModalProps> = ({ visuals, language, onClose, fileData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentVisual = visuals[currentIndex];
  
  // Safe Access
  const title = currentVisual?.title?.[language] || 'Visual';
  const description = currentVisual?.description?.[language] || '';

  const nextVisual = () => {
    setCurrentIndex((prev) => (prev + 1) % visuals.length);
  };

  const prevVisual = () => {
    setCurrentIndex((prev) => (prev - 1 + visuals.length) % visuals.length);
  };

  // Render a simple SVG Bar Chart
  const renderBarChart = (data: NonNullable<VisualAsset['chartData']>) => {
    const maxValue = Math.max(...data.values, 1);
    const chartHeight = 250;
    const barWidth = 40;
    const gap = 30;
    const totalBarWidth = data.values.length * (barWidth + gap);
    
    // Estimate label height for bottom margin based on label length (rough approx)
    const maxLabelLength = Math.max(...data.labels.map(l => l.length));
    const bottomMargin = Math.min(maxLabelLength * 6, 120) + 20; 
    const totalHeight = chartHeight + bottomMargin;

    return (
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-[300px] flex flex-col items-center">
            <svg width={Math.max(totalBarWidth + 40, 300)} height={totalHeight} className="mt-4 overflow-visible">
                {data.values.map((value, i) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = i * (barWidth + gap) + 20;
                const y = chartHeight - barHeight;
                return (
                    <g key={i}>
                    {/* Bar */}
                    <motion.rect
                        initial={{ height: 0, y: chartHeight }}
                        animate={{ height: barHeight, y: y }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="currentColor"
                        className="text-indigo-500 rx-1"
                        rx="4"
                    />
                    
                    {/* Value Label (Top of bar) */}
                    <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="fill-slate-700 text-xs font-bold"
                    >
                        {value}{data.unit}
                    </text>

                    {/* X-Axis Label (Rotated 45 degrees) */}
                    <text
                        x={x + barWidth / 2}
                        y={chartHeight + 15}
                        textAnchor="start"
                        transform={`rotate(45, ${x + barWidth / 2}, ${chartHeight + 15})`}
                        className="fill-slate-500 text-xs font-medium"
                        style={{ dominantBaseline: 'middle' }}
                    >
                        {data.labels[i]}
                    </text>
                    </g>
                );
                })}
                {/* Axis Line */}
                <line x1="0" y1={chartHeight} x2={Math.max(totalBarWidth + 40, 300)} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1" />
            </svg>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!currentVisual) return null;

    if (currentVisual.type === 'mermaid' && currentVisual.content) {
        return (
            <div className="flex flex-col h-full min-h-[300px] bg-slate-50 rounded-xl border border-slate-100 p-4">
                 <MermaidRenderer code={currentVisual.content} />
                 <p className="mt-4 text-center text-xs text-slate-400 italic">
                     {language === 'spanish' ? 'Diagrama reconstruido automáticamente por IA' : 'Diagram automatically reconstructed by AI'}
                 </p>
            </div>
        );
    }

    if (currentVisual.type === 'image_reference') {
        // If content is available (User uploaded image base64/DataURL)
        if (currentVisual.content) {
             const src = currentVisual.content.startsWith('data:') 
                ? currentVisual.content 
                : `data:image/png;base64,${currentVisual.content}`;
                
             return (
                <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm items-center justify-center p-4 bg-slate-50">
                    <img src={src} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                </div>
             );
        }

        // If we have fileData and page info (PDF extraction), render the actual image from PDF
        if (fileData && currentVisual.pageNumber) {
            return (
                <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="flex-1 overflow-auto bg-slate-50 p-4 flex items-center justify-center">
                        <PDFPageRenderer 
                            fileData={fileData} 
                            pageNumber={currentVisual.pageNumber}
                            boundingBox={currentVisual.boundingBox}
                        />
                    </div>
                </div>
            );
        }
        return (
             <div className="flex flex-col items-center justify-center h-full bg-slate-100 rounded-xl border border-slate-200 text-slate-400">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <p>Image Reference (Page {currentVisual.pageNumber})</p>
                <p className="text-xs">Original file not available for preview.</p>
            </div>
        );
    }

    if (currentVisual.type === 'audio' && currentVisual.content) {
        const src = currentVisual.content.startsWith('data:') 
            ? currentVisual.content 
            : `data:audio/mp3;base64,${currentVisual.content}`; // Fallback mime type
            
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-xl border border-slate-200 p-8">
                <div className="p-6 bg-indigo-100 rounded-full mb-6 text-indigo-600 animate-pulse">
                    <Music size={64} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-4">{title}</h3>
                <audio controls src={src} className="w-full max-w-md" />
            </div>
        );
    }

    if ((currentVisual.type === 'bar_chart' || currentVisual.type === 'pie_chart') && currentVisual.chartData) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full overflow-y-auto">
                {renderBarChart(currentVisual.chartData)}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 rounded-xl border border-slate-200 text-slate-400">
            <FileQuestion size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Visualization type '{currentVisual.type}'</p>
             {currentVisual.content && (
                <div className="mt-4 p-4 bg-white rounded border border-slate-200 text-xs text-left w-full max-w-md overflow-auto max-h-40">
                    <pre>{currentVisual.content}</pre>
                </div>
             )}
        </div>
    );
  };

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8"
        onClick={onClose}
    >
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        {currentVisual?.type === 'mermaid' ? <GitMerge size={20} /> :
                         currentVisual?.type === 'bar_chart' ? <BarChart3 size={20} /> :
                         currentVisual?.type === 'image_reference' ? <ImageIcon size={20} /> :
                         currentVisual?.type === 'audio' ? <Music size={20} /> :
                         <BarChart3 size={20} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{title}</h3>
                        <p className="text-xs text-slate-500">
                             {currentIndex + 1} / {visuals.length}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                    <X size={24} />
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Visual Area */}
                <div className="flex-1 bg-slate-50 p-6 overflow-hidden relative flex flex-col">
                     {renderContent()}
                </div>

                {/* Sidebar Info */}
                <div className="w-full md:w-80 bg-white border-l border-slate-100 p-6 overflow-y-auto shrink-0">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Description</h4>
                    <p className="text-slate-700 text-sm leading-relaxed mb-6">
                        {description || (language === 'spanish' ? 'Sin descripción.' : 'No description available.')}
                    </p>

                    {currentVisual?.chartData && (
                        <div className="mb-6">
                             <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Data Points</h4>
                             <div className="space-y-2">
                                 {currentVisual.chartData.labels.map((label, i) => (
                                     <div key={i} className="flex justify-between text-xs border-b border-slate-50 pb-1 last:border-0">
                                         <span className="text-slate-600 font-medium">{label}</span>
                                         <span className="text-slate-800 font-bold">{currentVisual.chartData?.values[i]}{currentVisual.chartData?.unit}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            {visuals.length > 1 && (
                <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
                    <button 
                        onClick={prevVisual}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-600"
                    >
                        <ChevronLeft size={16} />
                        <span>Previous</span>
                    </button>
                    <button 
                        onClick={nextVisual}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-600"
                    >
                        <span>Next</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </motion.div>
    </motion.div>
  );
};
