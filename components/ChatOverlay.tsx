
import React, { useEffect, useRef, useState } from 'react';
import { Message, Role, ProjectState } from '../types';
import MessageItem from './MessageItem';
import Icons from './Icon';

interface ChatOverlayProps {
    messages: Message[];
    onSendMessage: (text: string, image?: string, focusMode?: boolean) => void;
    isLoading: boolean;
    onClose: () => void;
    isOpen: boolean;
    project?: ProjectState;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ messages, onSendMessage, isLoading, onClose, isOpen, project }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection & Copy States
    const [selectionMode, setSelectionMode] = useState(false);
    const [startMsgId, setStartMsgId] = useState<string | null>(null);
    const [endMsgId, setEndMsgId] = useState<string | null>(null);
    const [includeThinking, setIncludeThinking] = useState(false);

    const chatMessages = messages.filter(m => 
        m.role === Role.USER || 
        m.role === Role.MODEL
    );

    useEffect(() => {
        if (isOpen && !selectionMode) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, selectionMode]);

    // Reset selection when mode closes
    useEffect(() => {
        if (!selectionMode) {
            setStartMsgId(null);
            setEndMsgId(null);
        }
    }, [selectionMode]);

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
            onSendMessage(input, imageBase64 || undefined, focusMode);
            setInput('');
            setImageBase64(null);
        }
    };

    // --- Range Selection Logic ---

    const handleMessageClick = (msgId: string) => {
        if (!selectionMode) return;

        if (!startMsgId) {
            setStartMsgId(msgId);
            setEndMsgId(null);
        } else if (!endMsgId) {
            // Determine order logic implicitly handled by getSelectedMessages
            setEndMsgId(msgId);
        } else {
            // Reset and start new
            setStartMsgId(msgId);
            setEndMsgId(null);
        }
    };

    const getSelectedMessages = () => {
        if (!startMsgId) return [];
        
        const startIdx = chatMessages.findIndex(m => m.id === startMsgId);
        if (startIdx === -1) return [];

        let endIdx = startIdx;
        if (endMsgId) {
             const eIdx = chatMessages.findIndex(m => m.id === endMsgId);
             if (eIdx !== -1) endIdx = eIdx;
        }

        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);

        return chatMessages.slice(min, max + 1);
    };

    const handleCopySelection = () => {
        const selected = getSelectedMessages();
        if (selected.length === 0) return;

        const transcript = selected.map(m => {
            const header = `[${m.role.toUpperCase()}]`;
            let body = m.content;
            
            // Only simulate "Removing thinking" if we had separate thinking data, 
            // but here we can at least format it nicely.
            // If "Include Thinking" is OFF, we might want to suppress messages that are PURELY thinking (if any).
            if (!includeThinking && m.thinking) return null;

            return `${header}\n${body}`;
        }).filter(Boolean).join('\n\n');

        navigator.clipboard.writeText(transcript);
        setSelectionMode(false);
    };

    const handleExportSelection = () => {
        const selected = getSelectedMessages();
        if (selected.length === 0) return;
        
        const transcript = selected.map(m => {
             if (!includeThinking && m.thinking) return null;
             return `### ${m.role.toUpperCase()} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}`;
        }).filter(Boolean).join('\n\n---\n\n');

        const blob = new Blob([transcript], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aether-selection-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setSelectionMode(false);
    };

    if (!isOpen) return null;

    const selectedMsgs = getSelectedMessages();
    const isRangeValid = selectedMsgs.length > 0;

    return (
        <div className="absolute top-4 right-4 bottom-20 w-[480px] bg-[#121214]/95 backdrop-blur-xl border border-studio-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-opacity duration-200">
            
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 select-none bg-white/5">
                <div className="flex items-center gap-2 text-studio-text">
                    <Icons.MessageSquare size={16} className="text-blue-400" />
                    <div>
                        <div className="text-xs font-bold tracking-wide">Aether Link</div>
                        <div className="text-[9px] text-studio-dim">Quick Access Overlay</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    
                    {/* Toggle Selection Mode */}
                    <button 
                        onClick={() => setSelectionMode(!selectionMode)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors border ${selectionMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-transparent border-transparent text-studio-dim hover:text-white'}`}
                        title="Smart Range Select"
                    >
                        {selectionMode ? <Icons.Check size={10} /> : <Icons.Split size={10} />}
                        <span>{selectionMode ? 'Done' : 'Select'}</span>
                    </button>

                    <div className="w-px h-4 bg-white/10"></div>

                     <button 
                        onClick={() => setFocusMode(!focusMode)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors border ${focusMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-transparent text-studio-dim hover:text-white'}`}
                        title={focusMode ? "Chatting with SELECTED Node only" : "Chatting with ALL Nodes"}
                    >
                        <Icons.Focus size={10} />
                        <span>{focusMode ? 'Focused' : 'Global'}</span>
                    </button>
                    
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-studio-dim hover:text-white transition-colors ml-1">
                        <Icons.Close size={14} />
                    </button>
                </div>
            </div>

            {/* Selection Toolbar (Visible only when Select Mode is ON) */}
            {selectionMode && (
                <div className="bg-yellow-500/5 border-b border-yellow-500/10 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-yellow-500 font-mono">{selectedMsgs.length} selected</span>
                        
                        {/* Thinking Toggle */}
                        <button 
                            onClick={() => setIncludeThinking(!includeThinking)}
                            className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] transition-colors ${includeThinking ? 'bg-white/10 text-white border-white/20' : 'text-studio-dim border-transparent hover:bg-white/5'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${includeThinking ? 'bg-green-500' : 'bg-studio-dim'}`}></div>
                            Think Layer
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCopySelection} 
                            disabled={!isRangeValid}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide transition-colors ${isRangeValid ? 'bg-white/10 text-white hover:bg-white/20' : 'opacity-50 cursor-not-allowed text-studio-dim'}`}
                        >
                            <Icons.Copy size={10} /> Copy
                        </button>
                        <button 
                            onClick={handleExportSelection}
                            disabled={!isRangeValid}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide transition-colors ${isRangeValid ? 'bg-white/10 text-white hover:bg-white/20' : 'opacity-50 cursor-not-allowed text-studio-dim'}`}
                        >
                            <Icons.Download size={10} /> Export
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 relative">
                {selectionMode && (
                    <div className="absolute inset-0 pointer-events-none z-0 bg-stripes opacity-5"></div>
                )}

                {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-studio-dim opacity-50 select-none space-y-3">
                        <Icons.Zap size={32} />
                        <p className="text-xs">AI Orchestrator Ready</p>
                    </div>
                ) : (
                    <>
                        {chatMessages.map((msg, idx) => {
                            // Selection Logic Visuals
                            const isSelected = selectedMsgs.some(m => m.id === msg.id);
                            const isStart = msg.id === startMsgId;
                            const isEnd = msg.id === endMsgId;

                            return (
                                <div 
                                    key={msg.id} 
                                    onClick={() => handleMessageClick(msg.id)}
                                    className={`
                                        relative transition-all duration-200 rounded-xl
                                        ${selectionMode ? 'cursor-pointer hover:bg-white/5 ring-1 ring-transparent' : ''}
                                        ${selectionMode && isSelected ? 'bg-yellow-500/10 ring-yellow-500/30' : ''}
                                        ${selectionMode && (isStart || isEnd) ? 'ring-yellow-500 ring-opacity-100 bg-yellow-500/20' : ''}
                                    `}
                                >   
                                    {/* Selection Markers */}
                                    {selectionMode && isStart && <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>}
                                    {selectionMode && isEnd && isEnd !== isStart && <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>}
                                    
                                    <div className={`${selectionMode ? 'pointer-events-none p-2' : ''}`}>
                                        <MessageItem message={msg} />
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
                 {imageBase64 && (
                    <div className="flex items-center gap-2 mb-2 bg-[#252526] p-2 rounded-lg border border-studio-border w-fit">
                        <img src={imageBase64} alt="Preview" className="h-12 rounded" />
                        <button onClick={() => setImageBase64(null)} className="text-studio-dim hover:text-red-400"><Icons.Close size={12}/></button>
                    </div>
                )}
                <div className="relative bg-[#09090b] border border-studio-border rounded-xl shadow-inner flex items-end focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-studio-dim hover:text-white transition-colors"
                    >
                        <Icons.Plus size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
                    
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={`Ask ${focusMode ? 'Active Node' : 'System'}...`}
                        className="flex-1 bg-transparent border-none text-sm py-3 focus:outline-none resize-none custom-scrollbar max-h-32 placeholder-studio-dim/50"
                        rows={1}
                    />
                    
                    <button 
                        onClick={submitMessage}
                        disabled={(!input.trim() && !imageBase64) || isLoading}
                        className={`p-2 m-1.5 rounded-lg transition-all ${(input.trim() || imageBase64) && !isLoading ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-studio-dim opacity-50'}`}
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Send size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatOverlay;
