
import React from 'react';
import { ProjectState, NodeType, AetherNode } from '../types';
import Icons from './Icon';

interface SidebarProps {
    project: ProjectState;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
    isVisible: boolean;
    onOpenKernel: () => void;
    onOpenTerminal: () => void;
    onExportContext: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ project, setProject, onOpenKernel, onOpenTerminal, onExportContext }) => {
    
    const toggleCollapse = (id: string) => {
        setProject(prev => ({
            ...prev,
            nodes: { ...prev.nodes, [id]: { ...prev.nodes[id], collapsed: !prev.nodes[id].collapsed } }
        }));
    };

    const handleNodeClick = (id: string, type: NodeType) => {
        // Special visual handling for actionable system nodes
        if (id === 'root') {
            onOpenKernel();
            return; // Don't select, just open modal
        }
        if (id === 'sys_terminal') {
            onOpenTerminal();
            // We also select it so properties are visible if needed, but primary action is opening terminal
        }
        
        setProject(prev => ({ ...prev, selectedNodeId: id }));
    };

    const getNodeColor = (type: NodeType) => {
        switch(type) {
            case NodeType.SYSTEM: return 'text-pink-500 border-pink-500/20 bg-pink-500/5';
            case NodeType.AGENT: return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
            case NodeType.TOOL: return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
            case NodeType.MEMORY: return 'text-purple-500 border-purple-500/20 bg-purple-500/5';
            case NodeType.ROUTER: return 'text-orange-500 border-orange-500/20 bg-orange-500/5';
            default: return 'text-gray-400 border-gray-500/20 bg-gray-500/5';
        }
    };

    const renderNodeIcon = (type: NodeType) => {
        switch(type) {
            case NodeType.SYSTEM: return <Icons.Terminal size={14} />;
            case NodeType.AGENT: return <Icons.NodeAgent size={14} />;
            case NodeType.ROUTER: return <Icons.Router size={14} />;
            case NodeType.TOOL: return <Icons.NodeTool size={14} />;
            case NodeType.MEMORY: return <Icons.NodeMemory size={14} />;
            default: return <Icons.Zap size={14} />;
        }
    };

    const renderTree = (parentId: string | null, depth: number = 0) => {
        const nodes = (Object.values(project.nodes) as AetherNode[]).filter(n => n.parentId === parentId);
        if (nodes.length === 0) return null;

        return (
            <div className="flex flex-col">
                {nodes.map((node, index) => {
                    const isSelected = project.selectedNodeId === node.id;
                    const children = Object.values(project.nodes).filter(n => n.parentId === node.id);
                    const hasChildren = children.length > 0;
                    const isLast = index === nodes.length - 1;
                    const colorClass = getNodeColor(node.type);

                    // Special styling for actionable nodes
                    const isActionable = node.id === 'sys_terminal'; 

                    return (
                        <div key={node.id} className="relative pl-6">
                            {/* Circuit Lines (SVG) */}
                            <svg className="absolute left-0 top-0 h-full w-6 overflow-visible pointer-events-none">
                                {/* Vertical Line from Parent */}
                                {depth > 0 && (
                                    <path 
                                        d={`M 0 0 V ${isLast ? '18' : '100%'}`} 
                                        stroke="#27272a" 
                                        strokeWidth="1.5" 
                                        fill="none"
                                        className="opacity-50"
                                    />
                                )}
                                {/* Curve to Child */}
                                {depth > 0 && (
                                    <path 
                                        d="M 0 18 Q 6 18 12 18" 
                                        stroke="#27272a" 
                                        strokeWidth="1.5" 
                                        fill="none"
                                        className="opacity-50"
                                    />
                                )}
                            </svg>

                            <div className="py-1.5 relative z-10">
                                <div 
                                    onClick={() => handleNodeClick(node.id, node.type)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 group
                                        ${isSelected 
                                            ? 'bg-[#18181b] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                                            : 'bg-[#09090b] border-studio-border hover:border-studio-dim/40 hover:bg-[#121214]'}
                                        ${isActionable ? 'hover:border-green-500/50' : ''}
                                    `}
                                >
                                    {/* Expander */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                                        className={`
                                            w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 transition-colors flex-shrink-0
                                            ${!hasChildren && 'opacity-0 pointer-events-none'}
                                        `}
                                    >
                                        {node.collapsed ? <Icons.ChevronRight size={10} /> : <Icons.ChevronDown size={10} />}
                                    </button>
                                    
                                    {/* Icon Box */}
                                    <div className={`
                                        w-6 h-6 rounded flex items-center justify-center shadow-inner flex-shrink-0
                                        ${colorClass}
                                    `}>
                                        {renderNodeIcon(node.type)}
                                    </div>

                                    {/* Label Info */}
                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-mono text-[11px] font-bold tracking-wide truncate ${isSelected ? 'text-white' : 'text-studio-text group-hover:text-white'}`}>
                                            {node.name}
                                        </span>
                                        <span className="text-[9px] text-studio-dim font-mono uppercase tracking-wider opacity-60">
                                            {node.type}
                                        </span>
                                    </div>

                                    {/* Status/Action Indicator */}
                                    {isSelected && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                    )}
                                    {isActionable && !isSelected && (
                                        <div className="ml-auto opacity-0 group-hover:opacity-100 text-[9px] text-green-500 font-mono bg-green-500/10 px-1.5 py-0.5 rounded">OPEN</div>
                                    )}
                                </div>
                            </div>

                            {!node.collapsed && hasChildren && (
                                <div className="relative">
                                    {renderTree(node.id, depth + 1)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 flex flex-col">
            {/* Root Node - Actionable Launchpad */}
            <div className="mb-2 relative flex-shrink-0">
                 <div 
                    onClick={() => handleNodeClick('root', NodeType.SYSTEM)}
                    className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 mb-2 relative z-10
                        bg-studio-panel border-studio-border hover:border-pink-500/50 hover:bg-pink-500/5 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] group
                    `}
                >
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 group-hover:scale-105 transition-transform">
                        <Icons.Zap size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs text-white tracking-wide">Aether_Kernel</span>
                        <span className="text-[9px] text-pink-400/60 font-mono uppercase group-hover:text-pink-400">Click to Launch System</span>
                    </div>
                    <div className="ml-auto text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Icons.ChevronRight size={14} />
                    </div>
                </div>
                
                {/* Main Trunk Line */}
                <div className="absolute left-8 top-10 bottom-0 w-[2px] bg-studio-border/40"></div>
            </div>

            {/* Tree */}
            <div className="pl-2 flex-1">
                 {renderTree('root', 1)}
            </div>
            
            {/* Bottom Actions */}
            <div className="mt-4 pt-4 border-t border-studio-border flex-shrink-0">
                <button 
                    onClick={onExportContext}
                    className="w-full flex items-center justify-center gap-2 bg-studio-panel border border-studio-border hover:bg-white/5 text-studio-dim hover:text-white py-2 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-wide"
                >
                    <Icons.Download size={12} />
                    Export System Snapshot
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
