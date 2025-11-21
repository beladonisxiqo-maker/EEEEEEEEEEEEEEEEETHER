
import React from 'react';
import { ProjectState, NodeType, AetherNode } from '../types';
import Icons from './Icon';

interface ProjectTreeProps {
    project: ProjectState;
    onSelectNode: (id: string) => void;
    onDoubleSelectNode: (id: string) => void;
    onCreateNode: (type: NodeType) => void;
}

const ProjectTree: React.FC<ProjectTreeProps> = ({ project, onSelectNode, onDoubleSelectNode, onCreateNode }) => {
    const nodes = Object.values(project.nodes) as AetherNode[];

    const agents = nodes.filter(n => n.type === NodeType.AGENT || n.type === NodeType.ROUTER);
    const tools = nodes.filter(n => n.type === NodeType.TOOL);
    const memories = nodes.filter(n => n.type === NodeType.MEMORY);
    const system = nodes.filter(n => n.type === NodeType.SYSTEM && n.id !== 'root');

    const TreeItem = ({ node, icon, colorClass }: { node: AetherNode, icon: React.ReactNode, colorClass: string }) => (
        <div 
            onClick={() => onSelectNode(node.id)}
            onDoubleClick={() => onDoubleSelectNode(node.id)}
            className={`
                group flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer select-none transition-colors text-xs font-medium
                ${project.selectedNodeId === node.id 
                    ? 'bg-[#2a2d31] text-white' 
                    : 'text-[#8b949e] hover:bg-[#1c2128] hover:text-white'}
            `}
        >
            <div className={`opacity-80 group-hover:opacity-100 ${colorClass}`}>{icon}</div>
            <span className="truncate">{node.name}</span>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full bg-[#0d1117] font-sans text-[13px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
                <span className="text-[10px] font-bold uppercase text-[#8b949e] px-2">Explorer</span>
                <div className="flex gap-1">
                    <button onClick={() => onCreateNode(NodeType.AGENT)} className="p-1 hover:bg-[#30363d] rounded text-blue-400" title="Add Agent"><Icons.Plus size={14}/></button>
                    <button onClick={() => onCreateNode(NodeType.TOOL)} className="p-1 hover:bg-[#30363d] rounded text-yellow-400" title="Add Tool"><Icons.Plus size={14}/></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-5">
                
                {/* Project Root */}
                <div className="mb-2">
                    <TreeItem 
                        node={project.nodes[project.rootNodeId]} 
                        colorClass="text-pink-400" 
                        icon={<Icons.Cpu size={14} />} 
                    />
                </div>

                {/* Groups */}
                <div>
                    <div className="flex items-center gap-1 px-2 text-[10px] font-bold text-[#484f58] mb-1 uppercase tracking-wider">
                        AGENTS
                    </div>
                    <div className="space-y-0.5">
                        {agents.map(n => <TreeItem key={n.id} node={n} colorClass="text-blue-400" icon={<Icons.NodeAgent size={14}/>} />)}
                    </div>
                </div>

                <div>
                     <div className="flex items-center gap-1 px-2 text-[10px] font-bold text-[#484f58] mb-1 uppercase tracking-wider">
                        TOOLS
                    </div>
                    <div className="space-y-0.5">
                        {tools.map(n => <TreeItem key={n.id} node={n} colorClass="text-yellow-400" icon={<Icons.NodeTool size={14}/>} />)}
                    </div>
                </div>

                <div>
                     <div className="flex items-center gap-1 px-2 text-[10px] font-bold text-[#484f58] mb-1 uppercase tracking-wider">
                        MEMORY BANK
                    </div>
                    <div className="space-y-0.5">
                        {memories.map(n => <TreeItem key={n.id} node={n} colorClass="text-purple-400" icon={<Icons.NodeMemory size={14}/>} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTree;
