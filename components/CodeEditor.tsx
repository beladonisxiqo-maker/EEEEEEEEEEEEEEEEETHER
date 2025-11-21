
import React, { useState, useEffect, useCallback } from 'react';
import { AetherNode, NodeType, ProjectState } from '../types';
import Icons from './Icon';
import NodeInspector from './NodeInspector';

interface CodeEditorProps {
    node: AetherNode;
    project: ProjectState;
    setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
    onRun: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ node, project, setProject, onRun }) => {
    const [showSettings, setShowSettings] = useState(false);
    
    // Optimization: Local state for editing to prevent global re-renders on every keystroke
    const [localContent, setLocalContent] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const getLanguage = () => {
        if (node.language) return node.language;
        if (node.type === NodeType.TOOL) return 'python';
        if (node.type === NodeType.MEMORY) return 'json';
        return 'text';
    };

    const language = getLanguage();

    // Sync local state when the selected node changes
    useEffect(() => {
        const content = node.code || node.systemInstruction || node.memoryContent || "";
        setLocalContent(content);
        setIsTyping(false);
    }, [node.id]); 

    // Debounced save to global project state
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isTyping) {
                const key = node.type === NodeType.MEMORY ? 'memoryContent' : node.type === NodeType.AGENT ? 'systemInstruction' : 'code';
                setProject(prev => ({
                    ...prev,
                    nodes: {
                        ...prev.nodes,
                        [node.id]: { ...prev.nodes[node.id], [key]: localContent }
                    }
                }));
                setIsTyping(false);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timeoutId);
    }, [localContent, isTyping, node.id, node.type, setProject]);

    const handleChange = (newContent: string) => {
        setLocalContent(newContent);
        setIsTyping(true);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] font-mono text-xs text-[#d4d4d4] relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333] select-none">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-studio-dim">
                        {node.type === NodeType.TOOL ? <Icons.NodeTool size={14} /> : <Icons.NodeAgent size={14} />}
                        <span className="font-medium text-white">{node.name}.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'json'}</span>
                        {isTyping && <span className="text-[10px] text-yellow-500 opacity-70 animate-pulse">●</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {node.type === NodeType.TOOL && (
                        <button onClick={onRun} className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white transition-colors">
                            <Icons.Play size={12} fill="currentColor" />
                            <span className="font-bold tracking-wide text-[10px]">RUN</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded transition-colors ${showSettings ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-studio-dim'}`}
                        title="Node Settings"
                    >
                        <Icons.Settings size={14} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative overflow-hidden flex">
                <div className="w-12 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-end pr-3 pt-4 text-studio-dim/30 select-none">
                    {localContent.split('\n').map((_, i) => <div key={i} className="h-5 leading-5">{i + 1}</div>)}
                </div>
                <textarea 
                    spellCheck={false}
                    value={localContent}
                    onChange={(e) => handleChange(e.target.value)}
                    className="flex-1 bg-transparent p-4 resize-none focus:outline-none leading-5 font-mono text-xs text-[#ce9178] custom-scrollbar"
                    placeholder={node.type === NodeType.MEMORY ? "// Enter JSON or Text data..." : "// Write your code here..."}
                />
                
                {/* Floating Inspector inside Code View */}
                {showSettings && (
                    <NodeInspector project={project} setProject={setProject} onClose={() => setShowSettings(false)} />
                )}
            </div>
        </div>
    );
};

export default CodeEditor;
