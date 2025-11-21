
import React from 'react';
import { ProjectState, NodeType, AetherNode } from '../types';
import Icons from './Icon';

interface FileExplorerProps {
    project: ProjectState;
    onSelectNode: (id: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ project, onSelectNode }) => {
    const nodes = Object.values(project.nodes) as AetherNode[];
    
    const agents = nodes.filter(n => n.type === NodeType.AGENT || n.type === NodeType.ROUTER);
    const tools = nodes.filter(n => n.type === NodeType.TOOL);
    const memories = nodes.filter(n => n.type === NodeType.MEMORY);
    const system = nodes.filter(n => n.type === NodeType.SYSTEM && n.id !== 'root');

    const FileItem = ({ node, ext, icon }: { node: AetherNode, ext: string, icon: React.ReactNode }) => (
        <div 
            onClick={() => onSelectNode(node.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-studio-dim hover:text-white hover:bg-white/5 rounded cursor-pointer group ${project.selectedNodeId === node.id ? 'bg-blue-500/10 text-blue-400' : ''}`}
        >
            <div className="opacity-70 group-hover:opacity-100">{icon}</div>
            <span>{node.name}.{ext}</span>
        </div>
    );

    return (
        <div className="p-4 font-mono text-xs select-none">
            <div className="mb-4 text-[10px] font-bold uppercase text-studio-dim/50 tracking-widest">Project Root</div>
            
            {/* Agents Directory */}
            <div className="mb-2">
                <div className="flex items-center gap-1 text-studio-text mb-1 font-bold">
                    <Icons.ChevronDown size={12} />
                    <span className="text-blue-400">src/agents</span>
                </div>
                <div className="pl-4 border-l border-studio-border/30 ml-1.5 space-y-0.5">
                    {agents.map(n => <FileItem key={n.id} node={n} ext="json" icon={<Icons.NodeAgent size={12}/>} />)}
                </div>
            </div>

            {/* Tools Directory */}
            <div className="mb-2">
                <div className="flex items-center gap-1 text-studio-text mb-1 font-bold">
                    <Icons.ChevronDown size={12} />
                    <span className="text-yellow-500">src/tools</span>
                </div>
                <div className="pl-4 border-l border-studio-border/30 ml-1.5 space-y-0.5">
                    {tools.map(n => <FileItem key={n.id} node={n} ext="py" icon={<Icons.NodeTool size={12}/>} />)}
                    {tools.length === 0 && <div className="text-studio-dim/30 italic px-2">empty</div>}
                </div>
            </div>

            {/* Memory Directory */}
            <div className="mb-2">
                <div className="flex items-center gap-1 text-studio-text mb-1 font-bold">
                    <Icons.ChevronDown size={12} />
                    <span className="text-purple-500">data/memory</span>
                </div>
                <div className="pl-4 border-l border-studio-border/30 ml-1.5 space-y-0.5">
                    {memories.map(n => <FileItem key={n.id} node={n} ext="md" icon={<Icons.NodeMemory size={12}/>} />)}
                </div>
            </div>

            {/* System Config */}
            <div className="mb-2">
                <div className="flex items-center gap-1 text-studio-text mb-1 font-bold">
                    <Icons.ChevronDown size={12} />
                    <span className="text-pink-500">config/system</span>
                </div>
                <div className="pl-4 border-l border-studio-border/30 ml-1.5 space-y-0.5">
                    {system.map(n => <FileItem key={n.id} node={n} ext="sys" icon={<Icons.Settings size={12}/>} />)}
                    <div className="flex items-center gap-2 px-3 py-1.5 text-studio-dim opacity-50 cursor-not-allowed">
                        <Icons.Settings size={12} />
                        <span>manifest.lock</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileExplorer;
