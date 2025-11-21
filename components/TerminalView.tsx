
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from '../types';

interface TerminalViewProps {
    messages: Message[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
}

const TerminalView: React.FC<TerminalViewProps> = ({ messages, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                onSendMessage(input);
                setInput('');
            }
        }
    };

    return (
        <div 
            className="w-full h-screen bg-black text-green-500 font-mono p-8 overflow-hidden flex flex-col selection:bg-green-500 selection:text-black"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                <div className="text-green-700 mb-4">
                    <div>Aether Universal Node [Version 1.0.0]</div>
                    <div>(c) 2025 Aether Systems. All rights reserved.</div>
                    <br/>
                    <div>Type <span className="text-white">/dev</span> to initialize Desktop Environment.</div>
                    <div>Type <span className="text-white">/help</span> for commands.</div>
                </div>

                {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col mb-2 break-words">
                        {msg.role === Role.USER && (
                            <div className="flex gap-2 text-white font-bold">
                                <span>user@nodehub:~$</span>
                                <span>{msg.content}</span>
                            </div>
                        )}
                        
                        {msg.role === Role.MODEL && (
                            <div className="pl-0 opacity-90 text-green-400 whitespace-pre-wrap">
                                {msg.content}
                                {msg.thinking && <span className="animate-pulse">_</span>}
                            </div>
                        )}

                        {msg.role === Role.SYSTEM && (
                            <div className="text-blue-400 italic">
                                [SYSTEM] {msg.content}
                            </div>
                        )}
                        
                        {msg.role === Role.TOOL && (
                            <div className="text-yellow-600 text-xs">
                                [EXEC] {msg.toolResponse?.name} -&gt; {msg.toolResponse?.content.substring(0, 50)}...
                            </div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-green-900/50 pt-4">
                <span className="text-green-500 font-bold">user@nodehub:~$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-green-900"
                    autoFocus
                />
                {isLoading && <span className="animate-pulse text-green-500">▐</span>}
            </div>
        </div>
    );
};

export default TerminalView;
