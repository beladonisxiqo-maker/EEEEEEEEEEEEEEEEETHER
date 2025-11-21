
import React, { useRef, useEffect } from 'react';
import { Message, Role } from '../types';
import Icons from './Icon';

interface TerminalPanelProps {
    messages: Message[]; 
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    activeTab: 'output' | 'problems' | 'debug';
    onSwitchTab: (tab: 'output' | 'problems' | 'debug') => void;
    onClose?: () => void;
    style?: React.CSSProperties;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ messages, isCollapsed, onToggleCollapse, activeTab, onSwitchTab, onClose, style }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    
    const logs = messages.filter(m => m.role === Role.SYSTEM || m.role === Role.TOOL || (m.role === Role.MODEL && m.toolCalls));
    
    useEffect(() => {
        if (!isCollapsed) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isCollapsed]);

    return (
        <div 
            className="flex flex-col w-full bg-[#0d1117] border-t border-[#30363d] font-mono text-xs overflow-hidden shadow-[0_-5px_10px_rgba(0,0,0,0.2)] z-40"
            style={style}
        >
            {/* Dock Header */}
            <div 
                onClick={onToggleCollapse}
                className="flex items-center justify-between px-4 h-8 bg-[#161b22] select-none cursor-pointer hover:bg-[#1c2128] shrink-0"
            >
                <div className="flex items-center h-full gap-4">
                     <div 
                        onClick={(e) => { e.stopPropagation(); onSwitchTab('output'); onToggleCollapse(); }}
                        className={`h-full flex items-center gap-2 px-1 border-b-2 transition-colors ${activeTab === 'output' && !isCollapsed ? 'border-blue-500 text-white' : 'border-transparent text-[#8b949e] hover:text-white'}`}
                    >
                         <span>OUTPUT</span>
                     </div>
                     <div 
                        onClick={(e) => { e.stopPropagation(); onSwitchTab('problems'); onToggleCollapse(); }}
                        className={`h-full flex items-center gap-2 px-1 border-b-2 transition-colors ${activeTab === 'problems' && !isCollapsed ? 'border-blue-500 text-white' : 'border-transparent text-[#8b949e] hover:text-white'}`}
                    >
                         <span>PROBLEMS</span>
                         <span className="px-1.5 bg-[#21262d] rounded-full text-[9px]">0</span>
                     </div>
                </div>

                <div className="flex items-center gap-3">
                     <button className="text-[#8b949e] hover:text-white" onClick={(e) => { e.stopPropagation(); onClose?.(); }}>
                        {isCollapsed ? <Icons.ChevronDown size={14} /> : <Icons.Close size={14} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div className="flex flex-col flex-1 overflow-hidden bg-[#0d1117] p-2">
                    {activeTab === 'output' && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                             {logs.length === 0 && <div className="text-[#484f58] italic">No output generated.</div>}
                             {logs.map((msg) => (
                                <div key={msg.id} className="flex gap-2 hover:bg-[#161b22] px-2 py-0.5 rounded">
                                    <span className="text-[#484f58] w-16 shrink-0 text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour12:false})}</span>
                                    <span className={`break-all ${msg.content.includes('Error') ? 'text-red-400' : msg.content.includes('success') ? 'text-green-400' : 'text-[#c9d1d9]'}`}>
                                        {msg.content}
                                        {msg.role === Role.TOOL && msg.toolResponse && ` -> ${typeof msg.toolResponse.content === 'string' ? msg.toolResponse.content.substring(0, 200) : 'Data'}`}
                                    </span>
                                </div>
                             ))}
                             <div ref={bottomRef} />
                        </div>
                    )}
                    {activeTab === 'problems' && (
                        <div className="flex-1 flex items-center justify-center text-[#484f58]">No problems detected in workspace.</div>
                    )}
                    {activeTab === 'debug' && (
                        <div className="flex-1 flex items-center justify-center text-[#484f58]">Debugger not attached.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TerminalPanel;
