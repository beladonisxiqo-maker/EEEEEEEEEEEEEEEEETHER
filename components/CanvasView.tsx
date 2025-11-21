
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectState, NodeType, AetherNode } from '../types';
import Icons from './Icon';
import NodeInspector from './NodeInspector';

interface CanvasViewProps {
    project: ProjectState;
    onSelectNode: (id: string) => void;
    onOpenCode: (id: string) => void;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
    onCreateNode: (type: NodeType) => { newNode: AetherNode; parentName: string };
}

const CanvasView: React.FC<CanvasViewProps> = ({ project, onSelectNode, onOpenCode, setProject, onCreateNode }) => {
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [notification, setNotification] = useState<{text: string, subtext?: string, visible: boolean} | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            const { width } = containerRef.current.getBoundingClientRect();
            setPan({ x: width / 2 - 100, y: 100 });
        }
    }, []);

    useEffect(() => {
        if (notification?.visible) {
            const timer = setTimeout(() => {
                setNotification(prev => prev ? {...prev, visible: false} : null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleCreate = (type: NodeType) => {
        const { newNode, parentName } = onCreateNode(type);
        setNotification({
            text: `Deployed ${type}`,
            subtext: `Attached to ${parentName}`,
            visible: true
        });
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const newZoom = Math.min(Math.max(0.2, zoom - e.deltaY * zoomSensitivity), 3);
            setZoom(newZoom);
        } else {
            setPan(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).closest('.canvas-bg')) {
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const renderNodeCard = (node: any, x: number, y: number) => {
        const isSelected = project.selectedNodeId === node.id;
        const isKernel = node.type === NodeType.SYSTEM && node.id === 'root';
        
        const getBorderClass = () => {
            if (isSelected) return 'ring-2 ring-blue-500 border-transparent shadow-[0_0_40px_rgba(59,130,246,0.4)]';
            switch(node.type) {
                case NodeType.AGENT: return 'border-blue-500/30 hover:border-blue-400';
                case NodeType.TOOL: return 'border-yellow-500/30 hover:border-yellow-400';
                case NodeType.MEMORY: return 'border-purple-500/30 hover:border-purple-400';
                case NodeType.SYSTEM: return 'border-pink-500/30 hover:border-pink-400';
                default: return 'border-studio-border';
            }
        };

        const getBgClass = () => {
            if (isKernel) return 'bg-gradient-to-br from-[#1a1a1d] to-[#000]';
            // Reduced blur for performance
            return 'bg-[#121214]/90 backdrop-blur-[2px]'; 
        }

        const cardWidth = isKernel ? 220 : 200;
        const cardHeight = isKernel ? 110 : 90;

        return (
            <div
                key={node.id}
                className="absolute z-20 transition-transform duration-75 will-change-transform"
                style={{ 
                    transform: `translate(${x}px, ${y}px)`,
                    width: cardWidth,
                    height: cardHeight
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSelectNode(node.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); onOpenCode(node.id); }}
            >
                <div className={`w-full h-full rounded-xl border flex flex-col relative group select-none cursor-pointer overflow-hidden ${getBorderClass()} ${getBgClass()}`}>
                    {isKernel && <div className="absolute inset-0 bg-pink-500/5 z-0 animate-pulse duration-[5000ms]"></div>}

                    <div className="flex items-center justify-between p-3 pb-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${isKernel ? 'bg-pink-500 text-white' : 'bg-white/5 text-studio-dim'}`}>
                                {node.type === NodeType.AGENT ? <Icons.NodeAgent size={12}/> : 
                                 node.type === NodeType.TOOL ? <Icons.NodeTool size={12}/> : 
                                 node.type === NodeType.MEMORY ? <Icons.NodeMemory size={12}/> :
                                 <Icons.Zap size={12}/>}
                            </div>
                            <span className="text-[9px] font-bold uppercase text-studio-dim tracking-wider">
                                {isKernel ? 'KERNEL HOST' : node.type}
                            </span>
                        </div>
                        {node.code && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]"></div>}
                    </div>

                    <div className="px-3 flex-1 flex flex-col justify-center relative z-10">
                        <span className={`font-bold truncate ${isSelected ? 'text-white' : 'text-studio-text'} ${isKernel ? 'text-base' : 'text-xs'}`}>
                            {node.name}
                        </span>
                        <span className="text-[9px] font-mono text-studio-dim truncate opacity-50 mt-0.5">
                            {node.id.substring(0,8)}
                        </span>
                    </div>

                    {!isKernel && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#18181b] border border-studio-dim rounded-full z-30"></div>}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#18181b] border border-studio-dim rounded-full z-30 group-hover:bg-blue-500 transition-colors"></div>
                </div>
            </div>
        );
    };

    // Memoize layout calculation - huge performance gain
    const { nodesToRender, edgesToRender } = useMemo(() => {
        const nRender: React.ReactNode[] = [];
        const eRender: React.ReactNode[] = [];

        const calculateLayout = (nodeId: string, x: number, y: number, depth: number, parentX?: number, parentY?: number) => {
            const node = project.nodes[nodeId];
            if (!node) return;

            const isKernel = node.type === NodeType.SYSTEM && node.id === 'root';
            const width = isKernel ? 220 : 200;

            nRender.push(renderNodeCard(node, x, y));

            if (parentX !== undefined && parentY !== undefined) {
                const pW = parentX === 0 && parentY === 0 ? 220 : 200;
                const pH = parentX === 0 && parentY === 0 ? 110 : 90;
                const startX = parentX + pW / 2;
                const startY = parentY + pH;
                const endX = x + width / 2;
                const endY = y;
                const cp1x = startX;
                const cp1y = startY + 50;
                const cp2x = endX;
                const cp2y = endY - 50;
                const isSelected = project.selectedNodeId === nodeId;
                
                eRender.push(
                    <g key={`edge-${nodeId}`}>
                        <path d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                            fill="none" stroke={isSelected ? "#3b82f6" : "#27272a"} strokeWidth={isSelected ? 3 : 2}
                            className="transition-colors duration-300" />
                        {isSelected && (
                            <circle cx={0} cy={0} r={3} fill="#60a5fa">
                                <animateMotion dur="1.5s" repeatCount="indefinite" path={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}/>
                            </circle>
                        )}
                    </g>
                );
            }

            const children = (Object.values(project.nodes) as AetherNode[]).filter(n => n.parentId === nodeId);
            if (children.length > 0) {
                const gapX = 240;
                const gapY = 150;
                const totalWidth = children.length * gapX;
                let startX = x - (totalWidth / 2) + (gapX / 2);
                children.forEach((child) => {
                    calculateLayout(child.id, startX, y + gapY, depth + 1, x, y);
                    startX += gapX;
                });
            }
        };

        calculateLayout(project.rootNodeId, 0, 0, 0);
        return { nodesToRender: nRender, edgesToRender: eRender };
    }, [project.nodes, project.selectedNodeId, project.rootNodeId]); // Only recalc if structure or selection changes

    return (
        <div 
            ref={containerRef}
            className="w-full h-full bg-[#09090b] overflow-hidden relative cursor-grab active:cursor-grabbing canvas-bg font-sans select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#161b22] border border-studio-border rounded-lg shadow-xl z-30">
                 <button onClick={() => handleCreate(NodeType.AGENT)} className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/5 text-studio-dim hover:text-blue-400 transition-colors text-xs font-medium">
                    <Icons.PlusCircle size={14} />
                    <span>Agent</span>
                </button>
                 <div className="w-px h-4 bg-studio-border/50 mx-1"></div>
                 <button onClick={() => handleCreate(NodeType.TOOL)} className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/5 text-studio-dim hover:text-yellow-400 transition-colors text-xs font-medium">
                    <Icons.PlusCircle size={14} />
                    <span>Tool</span>
                </button>
                 <div className="w-px h-4 bg-studio-border/50 mx-1"></div>
                 <button onClick={() => handleCreate(NodeType.MEMORY)} className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/5 text-studio-dim hover:text-purple-400 transition-colors text-xs font-medium">
                    <Icons.PlusCircle size={14} />
                    <span>Memory</span>
                </button>
                 <div className="w-px h-4 bg-studio-border/50 mx-1"></div>
                <button onClick={() => { setPan({x: containerRef.current!.clientWidth/2 - 100, y: 100}); setZoom(1); }} className="p-1.5 rounded hover:bg-white/5 text-studio-dim hover:text-white transition-colors" title="Fit View">
                    <Icons.Layout size={14} />
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`
                    absolute top-20 left-1/2 -translate-x-1/2 z-50 
                    bg-[#09090b] border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] 
                    rounded-lg px-4 py-3 flex flex-col items-center gap-0.5 transition-all duration-300
                    ${notification.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
                `}>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <Icons.Zap size={12} fill="currentColor"/>
                        <span>{notification.text}</span>
                    </div>
                    {notification.subtext && <span className="text-[10px] text-studio-dim font-mono">{notification.subtext}</span>}
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Render Layer with GPU acceleration hint */}
            <div 
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                    transformOrigin: '0 0', 
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }} 
                className="w-full h-full pointer-events-none will-change-transform"
            >
                <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] overflow-visible z-0">
                     <g transform="translate(5000, 5000)">{edgesToRender}</g>
                </svg>
                <div className="absolute top-0 left-0 z-10 pointer-events-auto">{nodesToRender}</div>
            </div>

            {/* Contextual Inspector - Floating */}
            <NodeInspector project={project} setProject={setProject} onClose={() => onSelectNode('')} />

            {/* HUD Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
                <div className="bg-[#161b22] border border-studio-border p-2 rounded-lg shadow-xl flex flex-col gap-2 text-[10px] font-mono text-studio-dim">
                    <div className="flex items-center justify-between gap-4"><span>ZOOM</span><span>{Math.round(zoom * 100)}%</span></div>
                </div>
                <button 
                    onClick={() => { setPan({x: containerRef.current!.clientWidth/2 - 100, y: 100}); setZoom(1); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg shadow-lg flex items-center justify-center"
                >
                    <Icons.Zap size={16} fill="currentColor"/>
                </button>
            </div>
        </div>
    );
};

export default CanvasView;
