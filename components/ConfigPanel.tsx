
import React from 'react';
import { ProjectState, NodeType, AVAILABLE_MODELS, PROVIDERS } from '../types';
import Icons from './Icon';

interface ConfigPanelProps {
    project: ProjectState;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
    isVisible: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ project, setProject, isVisible }) => {
    const selectedNode = project.nodes[project.selectedNodeId];

    if (!isVisible || !selectedNode) return null;

    const handleChange = (key: string, value: any) => {
        setProject(prev => ({
            ...prev,
            nodes: {
                ...prev.nodes,
                [selectedNode.id]: {
                    ...prev.nodes[selectedNode.id],
                    [key]: value
                }
            }
        }));
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 text-xs">
            
            {/* Node ID Header */}
            <div className="flex items-center justify-between text-studio-dim pb-2 border-b border-studio-border/50">
                <div className="flex items-center gap-2">
                    <span className="font-mono opacity-50 text-[10px]">ID: {selectedNode.id.substring(0,8)}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-white/5 text-studio-dim">
                    {selectedNode.type}
                </span>
            </div>

            {/* Common Properties */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-studio-dim font-medium">Node Name</label>
                    <input 
                        type="text" 
                        value={selectedNode.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full bg-studio-input border border-studio-border rounded-md px-3 py-2 text-studio-text focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                    />
                </div>
            </div>

            {/* LLM Config */}
            {(selectedNode.type === NodeType.AGENT || selectedNode.type === NodeType.ROUTER) && (
                <div className="space-y-4 pt-2">
                    <div className="text-[10px] font-bold uppercase text-blue-500/70 tracking-wider">Intelligence Config</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-studio-dim font-medium">Provider</label>
                            <select 
                                value={selectedNode.provider || 'google'}
                                onChange={(e) => handleChange('provider', e.target.value)}
                                className="w-full bg-studio-input border border-studio-border rounded-md px-2 py-2 text-studio-text"
                            >
                                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-studio-dim font-medium">Model</label>
                            <select 
                                value={selectedNode.model}
                                onChange={(e) => handleChange('model', e.target.value)}
                                className="w-full bg-studio-input border border-studio-border rounded-md px-2 py-2 text-studio-text truncate"
                            >
                                {AVAILABLE_MODELS.filter(m => m.provider === (selectedNode.provider || 'google')).map(model => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-studio-dim font-medium">Temperature</label>
                            <span className="font-mono text-studio-text">{selectedNode.temperature || 0.7}</span>
                        </div>
                        <input 
                            type="range" min="0" max="2" step="0.1" 
                            value={selectedNode.temperature || 0.7}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="w-full h-1 bg-studio-border rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-studio-dim font-medium">System Instructions</label>
                        <textarea
                            rows={10}
                            value={selectedNode.systemInstruction}
                            onChange={(e) => handleChange('systemInstruction', e.target.value)}
                            className="w-full bg-studio-input border border-studio-border rounded-md px-3 py-2 text-studio-text focus:ring-1 focus:ring-blue-500/50 font-mono text-[11px] leading-relaxed resize-none"
                            placeholder="// Define the agent's behavior..."
                        />
                    </div>
                </div>
            )}

            {/* Tool Config */}
            {selectedNode.type === NodeType.TOOL && (
                <div className="space-y-4 pt-2">
                     <div className="text-[10px] font-bold uppercase text-yellow-500/70 tracking-wider">Tool Configuration</div>
                     <div className="space-y-1">
                        <label className="text-studio-dim font-medium">Type</label>
                        <select 
                            value={selectedNode.toolType}
                            onChange={(e) => handleChange('toolType', e.target.value)}
                            className="w-full bg-studio-input border border-studio-border rounded-md px-3 py-2 text-studio-text"
                        >
                            <option value="googleSearch">Google Search</option>
                            <option value="api">External API</option>
                            <option value="function">Client Function</option>
                        </select>
                    </div>
                </div>
            )}

             {/* Memory Config */}
             {selectedNode.type === NodeType.MEMORY && (
                <div className="space-y-4 pt-2">
                    <div className="text-[10px] font-bold uppercase text-purple-500/70 tracking-wider">Knowledge Base</div>
                    <div className="space-y-1">
                        <label className="text-studio-dim font-medium">Content (JSON/Text)</label>
                        <textarea
                            rows={15}
                            value={selectedNode.memoryContent}
                            onChange={(e) => handleChange('memoryContent', e.target.value)}
                            className="w-full bg-studio-input border border-studio-border rounded-md px-3 py-2 text-[#ce9178] focus:ring-1 focus:ring-blue-500/50 font-mono text-[11px] leading-relaxed resize-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigPanel;
