
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import Icons from './Icon';

// Interface for global libraries
declare global {
    interface Window {
        mermaid: any;
        Chart: any;
    }
}

interface MessageItemProps {
    message: Message;
}

const ChartRenderer = ({ configString }: { configString: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (canvasRef.current && window.Chart) {
            try {
                // Clean the JSON string
                const cleanJson = configString.trim();
                let config;
                try {
                    config = JSON.parse(cleanJson);
                } catch (e) {
                    // Try to clean up common JSON formatting issues (e.g. trailing commas)
                     config = new Function(`return ${cleanJson}`)();
                }

                // Destroy previous instance
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                // Create new Chart
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    // Force dark mode defaults
                    window.Chart.defaults.color = '#a1a1aa';
                    window.Chart.defaults.borderColor = '#27272a';
                    
                    chartInstance.current = new window.Chart(ctx, {
                        ...config,
                        options: {
                            ...config.options,
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: { duration: 0 } // Instant render for perf
                        }
                    });
                }
            } catch (e: any) {
                console.error("Chart Render Error", e);
                setError("Invalid Chart Config: " + e.message);
            }
        }
        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [configString]);

    if (error) return <div className="text-red-500 text-xs p-2 border border-red-500/20 rounded bg-red-500/5 font-mono">{error}</div>;

    return (
        <div className="w-full h-64 bg-[#121214] rounded-lg border border-studio-border p-4 my-2">
            <canvas ref={canvasRef} />
        </div>
    );
};

const MermaidRenderer = ({ code }: { code: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');

    useEffect(() => {
        if (window.mermaid) {
            try {
                const renderId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                window.mermaid.render(renderId, code).then((result: any) => {
                    setSvg(result.svg);
                }).catch((e: any) => {
                    console.error("Mermaid Error", e);
                    // Mermaid usually outputs an error SVG, but we can show a text fallback too
                    setSvg(`<div class="text-red-500 text-xs p-2">Diagram Syntax Error</div>`);
                });
            } catch (e) {
                setSvg(`<div class="text-red-500 text-xs p-2">Mermaid Init Failed</div>`);
            }
        }
    }, [code]);

    return (
        <div 
            ref={ref} 
            className="w-full overflow-x-auto bg-[#121214] p-4 rounded-lg border border-studio-border my-2 flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }} 
        />
    );
};

const MessageItem: React.FC<MessageItemProps> = React.memo(({ message }) => {
    const isUser = message.role === Role.USER;
    const isTool = message.role === Role.TOOL;
    const hasGrounding = message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0;
    const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
    };

    if (isTool) {
        return null; 
    }

    return (
        <div className={`group flex gap-4 py-4 transition-colors relative ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`
                w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md text-[10px] font-bold border
                ${isUser 
                    ? 'bg-studio-panel border-studio-border text-studio-text' 
                    : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}
            `}>
                {isUser ? 'U' : <Icons.Zap size={12} />}
            </div>

            <div className={`flex-1 max-w-[85%] min-w-0 ${isUser ? 'text-right' : ''}`}>
                
                {/* Tool Call Indicator */}
                {hasToolCalls && (
                    <div className="mb-2 flex flex-col gap-1">
                        {message.toolCalls!.map((call, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-studio-dim opacity-60">
                                <Icons.Zap size={8} />
                                <span>Calling</span>
                                <span className="text-yellow-500">{call.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content Bubble */}
                <div className={`
                    relative inline-block text-sm leading-relaxed font-light tracking-wide
                    ${isUser ? 'text-studio-text' : 'text-studio-text'}
                `}>
                    {message.thinking ? (
                        <div className="flex items-center gap-2 text-studio-dim italic">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-mono">Thinking...</span>
                        </div>
                    ) : (
                        <div className={`prose prose-invert prose-sm max-w-none ${isUser ? 'text-right' : 'text-left'}`}>
                            <ReactMarkdown
                                components={{
                                    code({node, inline, className, children, ...props}: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const codeContent = String(children).replace(/\n$/, '');

                                        if (!inline && match) {
                                            const lang = match[1];
                                            
                                            // 1. Chart.js Renderer
                                            if (lang === 'json-chart') {
                                                return <ChartRenderer configString={codeContent} />;
                                            }

                                            // 2. Mermaid Diagram Renderer
                                            if (lang === 'mermaid') {
                                                return <MermaidRenderer code={codeContent} />;
                                            }
                                        }

                                        return !inline ? (
                                            <div className="relative group/code my-3 not-prose text-left">
                                                <div className="absolute -top-3 right-2 px-2 py-0.5 rounded bg-studio-800 text-[9px] text-studio-dim font-mono uppercase opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                    {match ? match[1] : 'text'}
                                                </div>
                                                <code className="block bg-[#0c0c0e] border border-studio-border/50 rounded-lg p-3 text-xs font-mono overflow-x-auto" {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        ) : (
                                            <code className="bg-white/5 px-1 py-0.5 rounded text-[11px] font-mono text-blue-200" {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Copy Button (Hover) */}
                {!message.thinking && (
                    <button 
                        onClick={handleCopy}
                        className={`
                            absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded text-studio-dim
                            ${isUser ? '-left-8' : '-right-8'}
                        `}
                        title="Copy Message"
                    >
                        <Icons.Copy size={12} />
                    </button>
                )}

                {/* Grounding Sources */}
                {hasGrounding && !message.thinking && (
                    <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                        {message.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                            if (chunk.web) {
                                return (
                                    <a 
                                        key={idx} 
                                        href={chunk.web.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 bg-studio-panel/50 hover:bg-studio-panel border border-studio-border/50 rounded px-1.5 py-0.5 text-[9px] text-studio-dim hover:text-blue-400 transition-colors"
                                    >
                                        <Icons.Search size={8} />
                                        <span className="truncate max-w-[150px]">{chunk.web.title}</span>
                                    </a>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MessageItem;
