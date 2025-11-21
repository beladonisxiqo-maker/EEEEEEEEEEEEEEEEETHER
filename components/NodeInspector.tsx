import React, { useState, useEffect } from 'react';
import { ProjectState, NodeType, AVAILABLE_MODELS, PROVIDERS, AetherNode } from '../types';
import Icons from './Icon';
import { fetchAvailableModels } from '../services/aiEngine.ts';

interface NodeInspectorProps {
    project: ProjectState;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
    onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ project, setProject, onClose }) => {
    const selectedNode = project.nodes[project.selectedNodeId];
    const [localNode, setLocalNode] = useState<any>(null);
    const [isDirty, setIsDirty] = useState(false);
    
    const [dynamicModels, setDynamicModels] = useState<any[]>(AVAILABLE_MODELS);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (selectedNode) {
            setLocalNode(JSON.parse(JSON.stringify(selectedNode)));
            setIsDirty(false);
        } else {
            setLocalNode(null);
        }
    }, [selectedNode]);

    const refreshModels = async () => {
        setIsFetchingModels(true);
        try {
            const models = await fetchAvailableModels(localNode.provider || 'google', localNode.apiKey);
            if (models.length > 0) {
                const providerModels = models.map(m => ({ provider: localNode.provider || 'google', id: m.id, name: m.name }));
                const otherModels = dynamicModels.filter(m => m.provider !== (localNode.provider || 'google'));
                setDynamicModels([...providerModels, ...otherModels]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsFetchingModels(false);
        }
    };

    if (!selectedNode || !localNode) return null;

    const handleChange = (key: string, value: any) => {
        setLocalNode((prev: any) => {
            const updated = { ...prev, [key]: value };
            setIsDirty(JSON.stringify(updated) !== JSON.stringify(selectedNode));
            return updated;
        });
    };

    const handleSave = () => {
        setProject(prev => ({
            ...prev,
            nodes: { ...prev.nodes, [localNode.id]: localNode }
        }));
        setIsDirty(false);
    };

    const handleRevert = () => {
        setLocalNode(JSON.parse(JSON.stringify(selectedNode)));
        setIsDirty(false);
    };

    const getTypeColor = (type: NodeType) => {
        switch(type) {
            case NodeType.AGENT: return 'text-blue-400 border-blue-500/30';
            case NodeType.TOOL: return 'text-yellow-400 border-yellow-500/30';
            case NodeType.MEMORY: return 'text-purple-400 border-purple-500/30';
            case NodeType.SYSTEM: return 'text-pink-400 border-pink-500/30';
            default: return 'text-gray-400 border-gray-500/30';
        }
    };

    const getPotentialParents = () => {
        return (Object.values(project.nodes) as AetherNode[]).filter(n => 
            (n.type === NodeType.AGENT || n.type === NodeType.ROUTER || n.type === NodeType.TOOL || n.id === project.rootNodeId) && 
            n.id !== localNode.id && 
            n.parentId !== localNode.id 
        );
    };

    return (
        <div 
            className="absolute top-4 right-4 w-[320px] flex flex-col gap-2 z-40 max-h-[85vh]"
            onMouseDown={(e) => e.stopPropagation()} 
        >
            {/* Main Card */}
            <div className="bg-[#121214]/95 backdrop-blur-md border border-studio-border rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/5">
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeColor(localNode.type)} bg-black/20`}>
                        {localNode.type === NodeType.AGENT ? <Icons.NodeAgent size={10}/> : 
                         localNode.type === NodeType.TOOL ? <Icons.NodeTool size={10}/> : 
                         localNode.type === NodeType.MEMORY ? <Icons.NodeMemory size={10}/> :
                         <Icons.Zap size={10}/>}
                        <span>{localNode.type}</span>
                    </div>
                    <button onClick={onClose} className="text-studio-dim hover:text-white p-1 rounded hover:bg-white/10">
                        <Icons.Close size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar space-y-5 max-h-[60vh]">
                    
                    {/* Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-studio-dim font-bold uppercase">Node Identifier</label>
                        <input 
                            type="text" 
                            value={localNode.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full bg-[#09090b] border border-studio-border rounded-md px-3 py-2 text-sm font-medium text-white focus:ring-1 focus:ring-blue-500/50 outline-none font-mono select-text"
                        />
                    </div>

                    {/* Hierarchy Control */}
                    {localNode.id !== project.rootNodeId && (
                         <div className="space-y-1.5">
                            <label className="text-[10px] text-studio-dim font-bold uppercase flex items-center gap-1">
                                <Icons.Split size={10}/>
                                <span>Attached To (Parent)</span>
                            </label>
                            <select 
                                value={localNode.parentId || project.rootNodeId}
                                onChange={(e) => handleChange('parentId', e.target.value)}
                                className="w-full bg-[#09090b] border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text focus:border-blue-500 outline-none"
                            >
                                {getPotentialParents().map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Agent Config */}
                    {(localNode.type === NodeType.AGENT || localNode.type === NodeType.ROUTER) && (
                        <div className="space-y-4 pt-2 border-t border-white/5">
                             
                             {/* API Credential Injection */}
                             <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] text-studio-dim font-bold uppercase">API Credentials</label>
                                    <button onClick={() => setShowApiKey(!showApiKey)} className="text-[9px] text-blue-400 hover:underline">
                                        {showApiKey ? 'Hide' : 'Configure'}
                                    </button>
                                </div>
                                {showApiKey && (
                                    <input 
                                        type="password"
                                        value={localNode.apiKey || ''}
                                        onChange={(e) => handleChange('apiKey', e.target.value)}
                                        placeholder={`API Key for ${localNode.provider || 'Google'}...`}
                                        className="w-full bg-[#09090b] border border-studio-border rounded-md px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none placeholder-studio-dim/30 select-text"
                                        autoComplete="off"
                                    />
                                )}
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] text-studio-dim font-bold uppercase flex justify-between">
                                    <span>Model Provider</span>
                                    <span className="text-blue-400">{localNode.provider || 'google'}</span>
                                </label>
                                <select 
                                    value={localNode.provider || 'google'}
                                    onChange={(e) => handleChange('provider', e.target.value)}
                                    className="w-full bg-[#09090b] border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text focus:border-blue-500 outline-none"
                                >
                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-studio-dim font-bold uppercase flex justify-between items-center">
                                    <span>Model</span>
                                    <button 
                                        onClick={refreshModels} 
                                        disabled={isFetchingModels}
                                        className={`p-1 rounded hover:bg-white/10 text-blue-400 ${isFetchingModels ? 'animate-spin' : ''}`}
                                        title="Fetch latest models from API"
                                    >
                                        <Icons.Refresh size={10} />
                                    </button>
                                </label>
                                <select 
                                    value={localNode.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="w-full bg-[#09090b] border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text truncate focus:border-blue-500 outline-none"
                                >
                                    {dynamicModels.filter(m => m.provider === (localNode.provider || 'google')).map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-studio-dim font-bold uppercase">System Logic</label>
                                <textarea 
                                    rows={6}
                                    value={localNode.systemInstruction}
                                    onChange={(e) => handleChange('systemInstruction', e.target.value)}
                                    className="w-full bg-[#09090b] border border-studio-border rounded-md p-3 text-xs text-studio-text font-mono focus:border-blue-500 outline-none resize-none leading-relaxed select-text"
                                    placeholder="Define agent behavior..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Tool Config */}
                    {localNode.type === NodeType.TOOL && (
                        <div className="space-y-4 pt-2 border-t border-white/5">
                             <div className="space-y-2">
                                <label className="text-[10px] text-studio-dim font-bold uppercase">Functionality Type</label>
                                <select 
                                    value={localNode.toolType}
                                    onChange={(e) => handleChange('toolType', e.target.value)}
                                    className="w-full bg-[#09090b] border border-studio-border rounded-md px-2 py-1.5 text-xs text-studio-text focus:border-yellow-500 outline-none"
                                >
                                    <option value="googleSearch">Google Search</option>
                                    <option value="api">External API</option>
                                    <option value="function">Local Function</option>
                                </select>
                            </div>
                        </div>
                    )}

                     {/* Memory Config */}
                     {localNode.type === NodeType.MEMORY && (
                        <div className="space-y-4 pt-2 border-t border-white/5">
                             <div className="space-y-2">
                                <label className="text-[10px] text-studio-dim font-bold uppercase">Content Format</label>
                                 <div className="text-xs text-studio-dim bg-[#09090b] border border-studio-border rounded p-2">
                                     Memory nodes store static context or state data accessible by agents. Edit content in the Code view.
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Unsaved Changes Floating Bar */}
            {isDirty && (
                <div className="bg-[#09090b] border border-yellow-500/30 rounded-xl p-3 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-yellow-500 tracking-wide">Unsaved Changes</span>
                        <span className="text-[10px] text-studio-dim">Confirm new configuration?</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRevert}
                            className="p-2 rounded bg-[#161b22] hover:bg-[#1c2128] text-white transition-colors"
                            title="Revert Changes"
                        >
                            <Icons.RotateCcw size={14} />
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-blue-900/20"
                        >
                            APPLY
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodeInspector;