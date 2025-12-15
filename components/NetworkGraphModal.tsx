
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BrainCircuit, BookOpen, CheckCircle2, ZoomIn, ZoomOut, Maximize, FileText, Search, Users, BookMarked } from 'lucide-react';
import mermaid from 'mermaid';
import { ParsedDocument, FileSystemNode, DocumentSection } from '../types';

interface NetworkGraphModalProps {
  nodes: FileSystemNode[];
  onClose: () => void;
  language: 'original' | 'spanish';
}

type ViewMode = 'relationships' | 'thematic' | 'timeline' | 'mindmap';

interface GraphNode {
    id: string;
    type: 'root' | 'doc' | 'section' | 'keyword';
    label: string;
    data?: any;
    x: number;
    y: number;
    radius: number;
    color?: string;
    parentId?: string;
}

interface GraphLink {
    source: string;
    target: string;
    type: 'solid' | 'dashed';
}

export const NetworkGraphModal: React.FC<NetworkGraphModalProps> = ({ nodes, onClose, language }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap'); 
  const [svg, setSvg] = useState<string>('');
  
  // Graph State (Persistent)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Canvas State
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Detail Panel
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);

  // Data Prep
  const documents = useMemo(() => nodes
    .filter(n => n.type === 'document_folder' && n.data)
    .map(n => n.data as ParsedDocument), [nodes]);

  // --- PHYSICS SIMULATION ENGINE ---
  const runSimulation = useCallback((nodes: GraphNode[], links: GraphLink[], iterations: number = 50) => {
      const width = 2000; // Virtual space
      const height = 2000;
      const center = { x: 0, y: 0 };
      
      // Constants
      const REPULSION = 500; 
      const SPRING_LENGTH = 150;
      const SPRING_STRENGTH = 0.05;
      const COLLISION_PADDING = 20;

      // Clone to avoid mutation during calculation if needed, but here we mutate for performance then set state
      const simNodes = [...nodes];

      for (let k = 0; k < iterations; k++) {
          // 1. Repulsion (All nodes repel each other)
          for (let i = 0; i < simNodes.length; i++) {
              for (let j = i + 1; j < simNodes.length; j++) {
                  const a = simNodes[i];
                  const b = simNodes[j];
                  if (a.id === 'root') continue; 

                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const distSq = dx * dx + dy * dy || 1;
                  const dist = Math.sqrt(distSq);
                  const minDist = a.radius + b.radius + 50;

                  if (dist < minDist * 2) {
                      const force = REPULSION / (distSq * 0.1); // Stronger close range
                      const fx = (dx / dist) * force;
                      const fy = (dy / dist) * force;
                      
                      if (a.id !== 'root') { a.x += fx; a.y += fy; }
                      if (b.id !== 'root') { b.x -= fx; b.y -= fy; }
                  }
              }
          }

          // 2. Spring (Connected nodes attract)
          links.forEach(link => {
              const source = simNodes.find(n => n.id === link.source);
              const target = simNodes.find(n => n.id === link.target);
              if (!source || !target) return;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              
              // Sections should be closer than docs
              const targetLen = target.type === 'section' ? 120 : 250; 
              
              const force = (dist - targetLen) * SPRING_STRENGTH;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (source.id !== 'root') { source.x += fx; source.y += fy; }
              if (target.id !== 'root') { target.x -= fx; target.y -= fy; }
          });

          // 3. Hard Collision Detection (Overlap Prevention)
          for (let i = 0; i < simNodes.length; i++) {
              for (let j = i + 1; j < simNodes.length; j++) {
                  const a = simNodes[i];
                  const b = simNodes[j];
                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                  const minDist = a.radius + b.radius + COLLISION_PADDING;

                  if (dist < minDist) {
                      // Overlap detected, push apart hard
                      const overlap = minDist - dist;
                      const fx = (dx / dist) * overlap * 0.5;
                      const fy = (dy / dist) * overlap * 0.5;
                      
                      if (a.id !== 'root') { a.x += fx; a.y += fy; }
                      if (b.id !== 'root') { b.x -= fx; b.y -= fy; }
                  }
              }
          }
      }
      return simNodes;
  }, []);

  // --- INITIALIZATION & TOPOLOGY UPDATE ---
  useEffect(() => {
      if (viewMode !== 'mindmap') return;

      setGraphNodes(prevNodes => {
          // 1. Identify current structure based on expansion
          const newNodes: GraphNode[] = [];
          const newLinks: GraphLink[] = [];
          
          // Root
          const rootExists = prevNodes.find(n => n.id === 'root');
          newNodes.push(rootExists || { id: 'root', type: 'root', label: 'Project', x: 0, y: 0, radius: 60 });

          // Docs
          documents.forEach((doc, i) => {
              const docId = doc.id || `doc-${i}`;
              const existing = prevNodes.find(n => n.id === docId);
              
              // Initial radial position if new
              const angle = (i / documents.length) * 2 * Math.PI;
              const dist = 250;
              
              newNodes.push(existing || {
                  id: docId,
                  type: 'doc',
                  label: doc.title?.original || 'Untitled',
                  data: doc,
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  radius: 100,
                  parentId: 'root'
              });
              newLinks.push({ source: 'root', target: docId, type: 'solid' });

              // Sections (only if expanded)
              if (expandedIds.has(docId) && doc.sections) {
                  doc.sections.forEach((sec, j) => {
                      const secId = `sec-${docId}-${sec.id}`;
                      const secExisting = prevNodes.find(n => n.id === secId);
                      
                      // Place near parent if new
                      const parentX = existing?.x || Math.cos(angle) * dist;
                      const parentY = existing?.y || Math.sin(angle) * dist;
                      const spread = 0.5; // Spread sections out
                      const secAngle = angle + ((j - doc.sections.length/2) * spread);
                      
                      newNodes.push(secExisting || {
                          id: secId,
                          type: 'section',
                          label: sec.title?.original || 'Section',
                          data: sec,
                          x: parentX + Math.cos(secAngle) * 150,
                          y: parentY + Math.sin(secAngle) * 150,
                          radius: 60,
                          color: sec.colorTheme,
                          parentId: docId
                      });
                      newLinks.push({ source: docId, target: secId, type: 'dashed' });
                  });
              }
          });

          setGraphLinks(newLinks);
          
          // Run physics only to settle new nodes, preserving general layout
          // We run fewer iterations to prevent jumping
          return runSimulation(newNodes, newLinks, 20);
      });

  }, [documents, expandedIds, runSimulation, viewMode]);


  // --- INTERACTION HANDLERS ---
  const toggleNode = (nodeId: string, type: string) => {
      if (type === 'doc') {
          setExpandedIds(prev => {
              const next = new Set(prev);
              if (next.has(nodeId)) next.delete(nodeId);
              else next.add(nodeId);
              return next;
          });
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(z => Math.min(Math.max(0.1, z - e.deltaY * 0.001), 3));
      } else {
          setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
      if (nodeId) {
          e.stopPropagation();
          setDraggedNodeId(nodeId);
          setLastPos({ x: e.clientX, y: e.clientY });
      } else {
          setIsDraggingCanvas(true);
          setLastPos({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDraggingCanvas) {
          const dx = e.clientX - lastPos.x;
          const dy = e.clientY - lastPos.y;
          setPan(p => ({ x: p.x + dx, y: p.y + dy }));
          setLastPos({ x: e.clientX, y: e.clientY });
      } else if (draggedNodeId) {
          const dx = (e.clientX - lastPos.x) / zoom;
          const dy = (e.clientY - lastPos.y) / zoom;
          
          // Update node position directly in state for immediate feedback
          setGraphNodes(prev => prev.map(n => 
              n.id === draggedNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n
          ));
          setLastPos({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseUp = () => {
      setIsDraggingCanvas(false);
      setDraggedNodeId(null);
  };

  // --- MERMAID RENDERING ---
  useEffect(() => {
    if (viewMode === 'mindmap') return;
    const renderMermaid = async () => {
        let def = '';
        if (viewMode === 'relationships') {
            def = 'graph TD\n';
            // Styling definitions
            def += 'classDef paper fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#1e1b4b;\n';
            def += 'classDef author fill:#dcfce7,stroke:#166534,stroke-width:2px,rx:10,ry:10,color:#14532d;\n';
            
            // Add Documents
            documents.forEach((d, i) => {
                const safeTitle = (d.title?.original || 'Untitled').replace(/"/g, "'").substring(0,30);
                def += `doc${i}["${safeTitle}..."]:::paper\n`;
            });

            // Add Authors & Links
            documents.forEach((doc, i) => {
                doc.authors?.forEach(a => {
                    const authId = `auth${a.replace(/[^a-zA-Z0-9]/g,'')}`;
                    const authLabel = a.replace(/"/g, "'");
                    def += `${authId}(${authLabel}):::author\n`;
                    def += `doc${i} --- ${authId}\n`;
                });
            });

            // Add Citation Links (Fuzzy Matching)
            documents.forEach((sourceDoc, i) => {
                sourceDoc.references?.forEach(ref => {
                     // Check if this reference title roughly matches any other document title in the project
                     documents.forEach((targetDoc, j) => {
                         if (i === j) return;
                         const tTitle = targetDoc.title?.original?.toLowerCase();
                         // Match if target title is inside reference or vice versa (simple heuristic)
                         if (tTitle && tTitle.length > 8 && ref.toLowerCase().includes(tTitle)) {
                             def += `doc${i} -.->|cites| doc${j}\n`;
                         }
                     });
                });
            });

        } else if (viewMode === 'timeline') {
            def = 'timeline\ntitle Project Timeline\n';
            // Sort docs by date
            const sortedDocs = [...documents].sort((a, b) => 
                (a.publicationDate || '9999').localeCompare(b.publicationDate || '9999')
            );
            
            sortedDocs.forEach(d => {
                const date = d.publicationDate || 'Unknown Date';
                const safeTitle = (d.title?.original || 'Untitled').replace(/:/g, '-').substring(0,25);
                def += `${date} : ${safeTitle}\n`;
            });
        }

        if (def) {
            try {
                const id = `viz-${Date.now()}`;
                const { svg } = await mermaid.render(id, def);
                setSvg(svg);
            } catch (e) { 
                console.warn("Mermaid render error:", e);
                setSvg(`<div class="text-red-500 p-4">Error generating graph. Try renaming documents or check console.</div>`);
            }
        }
    };
    renderMermaid();
  }, [viewMode, documents]);

  return (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4"
        onClick={onClose}
    >
        <motion.div 
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg"><BrainCircuit size={20} /></div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Knowledge Map</h3>
                        <p className="text-xs text-slate-500">{documents.length} Documents &bull; Force Layout</p>
                    </div>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button onClick={() => setViewMode('mindmap')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${viewMode==='mindmap'?'bg-white shadow text-indigo-600':'text-slate-600'}`}>
                        <BrainCircuit size={14} /> Mind Map
                    </button>
                    <button onClick={() => setViewMode('relationships')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${viewMode==='relationships'?'bg-white shadow text-indigo-600':'text-slate-600'}`}>
                        <Users size={14} /> Relations
                    </button>
                    <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${viewMode==='timeline'?'bg-white shadow text-indigo-600':'text-slate-600'}`}>
                        <BookOpen size={14} /> Timeline
                    </button>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24} /></button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing"
                 onWheel={handleWheel}
                 onMouseDown={(e) => handleMouseDown(e)}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px', transform: `translate(${pan.x%24}px, ${pan.y%24}px)` }} 
                />

                <div className="w-full h-full flex items-center justify-center"
                     style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
                    
                    {viewMode === 'mindmap' ? (
                        <div className="relative">
                            {/* Links */}
                            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{width:1, height:1}}>
                                {graphLinks.map(link => {
                                    const source = graphNodes.find(n => n.id === link.source);
                                    const target = graphNodes.find(n => n.id === link.target);
                                    if (!source || !target) return null;
                                    return (
                                        <line 
                                            key={`${link.source}-${link.target}`}
                                            x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                                            stroke={link.type === 'dashed' ? '#cbd5e1' : '#94a3b8'}
                                            strokeWidth={link.type === 'dashed' ? 1.5 : 2}
                                            strokeDasharray={link.type === 'dashed' ? "6,4" : "0"}
                                        />
                                    );
                                })}
                            </svg>

                            {/* Nodes */}
                            {graphNodes.map(node => (
                                <motion.div
                                    key={node.id}
                                    layoutId={node.id}
                                    initial={false}
                                    animate={{ x: node.x, y: node.y }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }} // Smooth dragging
                                    className={`absolute flex flex-col items-center justify-center p-2 text-center select-none cursor-pointer border transition-all
                                        ${node.type === 'root' ? 'z-30 w-24 h-24 bg-slate-900 rounded-full text-white border-4 border-slate-800 shadow-xl' : ''}
                                        ${node.type === 'doc' ? 'z-20 w-48 bg-white rounded-xl border-indigo-100 shadow-md hover:border-indigo-400' : ''}
                                        ${node.type === 'section' ? `z-10 w-40 bg-white rounded-lg border-slate-200 shadow-sm hover:border-${node.color}-400 hover:shadow-md` : ''}
                                    `}
                                    style={{ 
                                        marginLeft: node.type==='root'?-48 : node.type==='doc'?-96 : -80, 
                                        marginTop: node.type==='root'?-48 : 'auto',
                                        borderColor: expandedIds.has(node.id) ? '#6366f1' : undefined
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (node.type === 'doc') toggleNode(node.id, 'doc');
                                        if (node.type === 'section') setSelectedSection(node.data);
                                    }}
                                >
                                    {node.type === 'root' && <BrainCircuit size={32} />}
                                    {node.type === 'doc' && (
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="p-1 bg-indigo-50 text-indigo-600 rounded shrink-0"><BookOpen size={16}/></div>
                                            <span className="text-xs font-bold text-slate-700 line-clamp-2 text-left leading-tight">{node.label}</span>
                                        </div>
                                    )}
                                    {node.type === 'section' && (
                                        <div className="flex items-center gap-2 w-full">
                                            <div className={`w-2 h-2 rounded-full shrink-0 bg-${node.color}-500`}/>
                                            <span className="text-[10px] font-medium text-slate-600 line-clamp-2 text-left leading-tight">{node.label}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div 
                            className="w-full h-full flex items-center justify-center"
                            dangerouslySetInnerHTML={{__html: svg}} 
                        />
                    )}
                </div>

                {/* Overlay Controls */}
                <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-lg">
                    <button onClick={() => setZoom(z => z+0.1)} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomIn size={20} /></button>
                    <button onClick={() => setZoom(z => Math.max(0.1, z-0.1))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomOut size={20} /></button>
                    <button onClick={() => {setPan({x:0,y:0}); setZoom(0.8);}} className="p-2 hover:bg-slate-100 rounded-lg"><Maximize size={20} /></button>
                </div>

                {/* Side Panel */}
                <AnimatePresence>
                    {selectedSection && (
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl p-6 z-40 overflow-y-auto"
                        >
                            <div className="flex justify-between mb-4">
                                <h3 className="font-bold text-xs text-slate-400 uppercase">Section Info</h3>
                                <button onClick={() => setSelectedSection(null)}><X size={18}/></button>
                            </div>
                            <h2 className="font-bold text-lg mb-4">{selectedSection.title.original}</h2>
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic mb-4">{selectedSection.summary.original}</div>
                            {selectedSection.keyPoints?.original.map((kp,i) => (
                                <div key={i} className="flex gap-2 mb-2 text-xs text-slate-700"><CheckCircle2 size={14} className="text-green-500 shrink-0"/><span>{kp}</span></div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    </motion.div>
  );
};
