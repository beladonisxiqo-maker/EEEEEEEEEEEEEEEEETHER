
import React, { Component, ErrorInfo, ReactNode } from 'react';
import Icons from './Icon';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a0f0f] text-red-400 p-8 border-2 border-red-900/50 rounded-xl m-4">
                    <Icons.Zap size={48} className="mb-4 opacity-50" />
                    <h2 className="text-xl font-bold uppercase tracking-widest mb-2">Runtime Critical Failure</h2>
                    <p className="text-sm text-red-400/70 font-mono mb-6 text-center max-w-md">
                        The simulation encountered a fatal error and has been suspended to protect the core system.
                    </p>
                    <div className="bg-black/30 p-4 rounded-lg border border-red-900/30 font-mono text-xs mb-6 w-full max-w-lg overflow-auto max-h-40">
                        {this.state.error?.message}
                    </div>
                    <button 
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            this.props.onReset?.();
                        }}
                        className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-lg transition-all uppercase font-bold text-xs tracking-wider"
                    >
                        Reset Simulation
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
