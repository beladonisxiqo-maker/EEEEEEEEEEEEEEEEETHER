
import React from 'react';
import { ProjectState, NodeType, AVAILABLE_MODELS, PROVIDERS } from '../types';
import Icons from './Icon';

interface InspectorProps {
    project: ProjectState;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
}

const Inspector: React.FC<InspectorProps> = ({ project, setProject }) => {
    const selectedNode = project.nodes[project.selectedNodeId];

    if (!selectedNode) return (
        <div className="flex-1 flex flex-col items-center justify-center text-studio-dim text-xs gap-2 bg-[#09090b]">
            <span>No selection</span>
        </div>
    );

    const handleChange = (key: string, value: any) => {
        setProject(prev => ({
            ...prev,
            nodes: { ...prev.nodes, [selectedNode.id]: { ...prev.nodes[selectedNode.id], [key]: value } }
        }));
    };

    const SectionHeader = ({ label, color = "text-studio-dim" }: { label: string, color?: string }) => (
        <div className="flex items-center py-2 mt-4 mb-2 border-b border-studio-border/50">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-full bg-[#09090b] font-sans overflow-hidden">
            <div className="h-9 flex items-center px-4 border-b border-[#30363d] bg-[#161b22] shrink-0">
                <span className="text-[10px] font-bold uppercase text-[#8b949e]">Inspector</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                
                {/* Identity */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#21262d] flex items-center justify-center border border-[#30363d]">
                            {selectedNode.type === NodeType.AGENT ? <Icons.NodeAgent size={16} className="text-blue-400"/> : 
                             selectedNode.type === NodeType.TOOL ? <Icons.NodeTool size={16} className="text-yellow-400"/> : 
                             selectedNode.type === NodeType.MEMORY ? <Icons.NodeMemory size={16} className="text-purple-400"/> :
                             <Icons.Zap size={16} className="text-pink-400"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <input 
                                type="text" 
                                value={selectedNode.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-white focus:ring-0 focus:outline-none placeholder-studio-dim"
                                placeholder="Node Name"
                            />
                            <div className="text-[10px] font-mono text-[#8b949e]">{selectedNode.type}</div>
                        </div>
                    </div>
                </div>

                {/* General Properties */}
                <div className="grid grid-cols-[80px_1fr] gap-y-3 items-center text-xs">
                    <label className="text-[#8b949e]">ID</label>
                    <span className="font-mono text-[#c9d1d9] text-[10px] truncate">{selectedNode.id}</span>
                    
                    <label className="text-[#8b949e]">Visibility</label>
                    <select className="bg-[#161b22] border border-[#30363d] rounded text-[#c9d1d9] text-[10px] py-1 px-2">
                        <option>Public</option>
                        <option>Private</option>
                    </select>
                </div>

                {/* Logic / Model Config */}
                {(selectedNode.type === NodeType.AGENT || selectedNode.type === NodeType.ROUTER) && (
                    <>
                        <SectionHeader label="Intelligence" color="text-blue-400" />
                        <div className="space-y-3">
                             <div className="space-y-1">
                                <label className="text-[10px] text-[#8b949e] uppercase font-bold">Provider</label>
                                <select 
                                    value={selectedNode.provider || 'google'}
                                    onChange={(e) => handleChange('provider', e.target.value)}
                                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                                >
                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#8b949e] uppercase font-bold">Model</label>
                                <select 
                                    value={selectedNode.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                                >
                                    {AVAILABLE_MODELS.filter(m => m.provider === (selectedNode.provider || 'google')).map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </select>
                            </div>
                             <div className="space-y-1">
                                <label className="text-[10px] text-[#8b949e] uppercase font-bold">Instruction</label>
                                <textarea 
                                    rows={6}
                                    value={selectedNode.systemInstruction}
                                    onChange={(e) => handleChange('systemInstruction', e.target.value)}
                                    className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-xs text-[#c9d1d9] font-mono focus:border-blue-500 outline-none resize-none leading-relaxed"
                                    placeholder="// System prompt..."
                                />
                            </div>
                        </div>
                    </>
                )}

                {selectedNode.type === NodeType.TOOL && (
                    <>
                        <SectionHeader label="Implementation" color="text-yellow-400" />
                        <div className="space-y-3">
                             <div className="space-y-1">
                                <label className="text-[10px] text-[#8b949e] uppercase font-bold">Type</label>
                                <select 
                                    value={selectedNode.toolType}
                                    onChange={(e) => handleChange('toolType', e.target.value)}
                                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1.5 text-xs text-white focus:border-yellow-500 outline-none"
                                >
                                    <option value="googleSearch">Google Search</option>
                                    <option value="api">External API</option>
                                    <option value="function">Python Function</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Inspector;
