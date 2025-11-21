
import React, { useEffect, useRef, useState } from 'react';
import { Message, Role, ProjectState, NodeType, ChatSession, AetherNode } from '../types';
import MessageItem from './MessageItem';
import Icons from './Icon';

interface ChatViewProps {
    sessions: ChatSession[];
    activeSessionId: string;
    onSwitchSession: (id: string) => void;
    onNewSession: () => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    messages: Message[];
    onSendMessage: (text: string, image?: string) => void;
    isLoading: boolean;
    project: ProjectState;
    activeContextIds: string[];
    onToggleContext: (id: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ 
    sessions, activeSessionId, onSwitchSession, onNewSession, onDeleteSession, onRenameSession,
    messages, onSendMessage, isLoading, project, activeContextIds, onToggleContext 
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showContextPanel, setShowContextPanel] = useState(true);
    const [showHistoryPanel, setShowHistoryPanel] = useState(true);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const chatMessages = messages.filter(m => 
        m.role === Role.USER || 
        m.role === Role.MODEL
    );

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setImageBase64(ev.target?.result as string);
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setImageBase64(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const submitMessage = () => {
        if ((input.trim() || imageBase64) && !isLoading) {
            onSendMessage(input, imageBase64 || undefined);
            setInput('');
            setImageBase64(null);
        }
    };

    const handleStartEdit = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditTitle(session.title);
    };

    const handleSaveEdit = (id: string) => {
        if (editTitle.trim()) {
            onRenameSession(id, editTitle.trim());
        }
        setEditingSessionId(null);
    };

    const getNodeColor = (type: NodeType) => {
        switch(type) {
            case NodeType.AGENT: return 'text-blue-400';
            case NodeType.TOOL: return 'text-yellow-400';
            case NodeType.MEMORY: return 'text-purple-400';
            default: return 'text-white';
        }
    };

    // Sort sessions by most recent update
    const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

    return (
        <div className="flex h-full bg-[#1e1e1e] text-studio-text relative overflow-hidden">
            
            {/* History Panel (Left) */}
            {showHistoryPanel && (
                <div className="w-60 border-r border-studio-border bg-[#121214] flex flex-col shrink-0 animate-in slide-in-from-left duration-200">
                    <div className="h-12 border-b border-studio-border flex items-center justify-between px-3 bg-[#161b22]">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowHistoryPanel(false)} className="text-studio-dim hover:text-white" title="Collapse History">
                                <Icons.LayoutSidebar size={14} />
                            </button>
                            <span className="text-xs font-bold uppercase tracking-wider text-studio-dim">History</span>
                        </div>
                        <button onClick={onNewSession} className="p-1.5 rounded hover:bg-white/10 text-studio-dim hover:text-white transition-colors" title="New Chat">
                            <Icons.Plus size={14} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {sortedSessions.map(session => (
                            <div 
                                key={session.id}
                                onClick={() => onSwitchSession(session.id)}
                                className={`
                                    group flex items-center gap-2 p-2 rounded cursor-pointer border transition-all relative
                                    ${activeSessionId === session.id ? 'bg-blue-500/10 border-blue-500/30 text-white' : 'bg-transparent border-transparent text-studio-dim hover:bg-white/5 hover:text-white'}
                                `}
                            >
                                <Icons.MessageSquare size={14} className="shrink-0 opacity-50" />
                                
                                {editingSessionId === session.id ? (
                                    <input 
                                        type="text" 
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={() => handleSaveEdit(session.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(session.id)}
                                        autoFocus
                                        className="flex-1 bg-black border border-blue-500 rounded px-1 text-xs text-white outline-none min-w-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-xs truncate flex-1">{session.title}</span>
                                )}

                                {/* Actions */}
                                {!editingSessionId && (
                                    <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-[#121214] pl-2">
                                        <button 
                                            onClick={(e) => handleStartEdit(session, e)} 
                                            className="p-1 hover:bg-white/10 rounded text-studio-dim hover:text-blue-400"
                                        >
                                            <Icons.Edit size={10} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                            className="p-1 hover:bg-white/10 rounded text-studio-dim hover:text-red-400"
                                        >
                                            <Icons.Trash size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-12 bg-[#1e1e1e] border-b border-studio-border flex items-center justify-between px-6 select-none shrink-0">
                    <div className="flex items-center gap-3">
                         {!showHistoryPanel && (
                             <button 
                                onClick={() => setShowHistoryPanel(true)}
                                className="p-2 rounded transition-colors text-studio-dim hover:text-white"
                                title="Expand History"
                            >
                                <Icons.LayoutSidebar size={16} />
                            </button>
                         )}
                        
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-white">Command Center</div>
                            <div className="text-[10px] text-studio-dim">Aether Orchestration Protocol</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowContextPanel(!showContextPanel)}
                        className={`p-2 rounded transition-colors ${showContextPanel ? 'text-blue-400 bg-blue-500/10' : 'text-studio-dim hover:text-white'}`}
                        title="Toggle Context Stack"
                    >
                        <Icons.Layers size={16} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-studio-dim opacity-50 select-none">
                            <Icons.Zap size={48} className="mb-4 text-studio-border" />
                            <p className="text-sm font-medium">System Online</p>
                            <p className="text-xs mt-2">Configure the Context Stack → and begin.</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6">
                            {chatMessages.map((msg) => (
                                <MessageItem key={msg.id} message={msg} />
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-6 pt-2 bg-[#1e1e1e] shrink-0">
                    <div className="max-w-3xl mx-auto relative">
                        {imageBase64 && (
                            <div className="absolute -top-24 left-0 p-2 bg-[#252526] border border-studio-border rounded-lg shadow-lg animate-slide-up">
                                <img src={imageBase64} alt="Preview" className="h-20 rounded" />
                                <button onClick={() => setImageBase64(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"><Icons.Close size={10} /></button>
                            </div>
                        )}
                        <div className="relative bg-[#252526] border border-studio-border rounded-xl shadow-lg focus-within:ring-1 focus-within:ring-blue-500/50 transition-all flex items-end">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-studio-dim hover:text-white transition-colors"><Icons.Plus size={18} /></button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Input command..."
                                className="flex-1 bg-transparent border-none text-sm py-4 focus:outline-none resize-none custom-scrollbar"
                                rows={1}
                                style={{ minHeight: '50px', maxHeight: '200px' }}
                            />
                            <button onClick={submitMessage} disabled={(!input.trim() && !imageBase64) || isLoading} className={`p-3 m-1 rounded-lg transition-all ${(input.trim() || imageBase64) && !isLoading ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-studio-dim opacity-50 cursor-not-allowed'}`}>
                                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Send size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Stack Panel */}
            {showContextPanel && (
                <div className="w-64 border-l border-studio-border bg-[#121214] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
                    <div className="h-12 border-b border-studio-border flex items-center px-4 text-xs font-bold uppercase tracking-wider text-studio-dim bg-[#161b22]">
                        Active Context Stack
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <div className="p-2 text-[10px] text-studio-dim opacity-70 leading-relaxed mb-2">
                            Select nodes to include in the prompt context. Unchecked nodes are invisible to the AI.
                        </div>
                        
                        {(Object.values(project.nodes) as AetherNode[]).map(node => {
                            if (node.id === project.rootNodeId) return null; // Root always active
                            const isActive = activeContextIds.includes(node.id);
                            return (
                                <div 
                                    key={node.id}
                                    onClick={() => onToggleContext(node.id)}
                                    className={`
                                        flex items-center gap-2 p-2 rounded cursor-pointer border transition-all
                                        ${isActive ? 'bg-blue-500/10 border-blue-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}
                                    `}
                                >
                                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${isActive ? 'bg-blue-500 border-blue-500' : 'border-studio-dim'}`}>
                                        {isActive && <Icons.Plus size={8} className="text-white rotate-45" />}
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        {node.type === NodeType.AGENT ? <Icons.NodeAgent size={12} className={getNodeColor(node.type)}/> : 
                                         node.type === NodeType.TOOL ? <Icons.NodeTool size={12} className={getNodeColor(node.type)}/> : 
                                         <Icons.NodeMemory size={12} className={getNodeColor(node.type)}/>}
                                        <span className={`text-xs truncate ${isActive ? 'text-white' : 'text-studio-dim'}`}>{node.name}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;
