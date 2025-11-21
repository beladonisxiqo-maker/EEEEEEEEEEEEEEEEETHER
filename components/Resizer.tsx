
import React from 'react';

interface ResizerProps {
    direction: 'horizontal' | 'vertical';
    onMouseDown: (e: React.MouseEvent) => void;
    isVisible?: boolean;
}

const Resizer: React.FC<ResizerProps> = ({ direction, onMouseDown, isVisible = true }) => {
    if (!isVisible) return null;

    return (
        <div
            className={`
                group relative flex items-center justify-center z-50
                ${direction === 'horizontal' ? 'w-1 h-full cursor-col-resize hover:bg-blue-500/50' : 'w-full h-1 cursor-row-resize hover:bg-blue-500/50'}
                transition-colors duration-150 bg-[#09090b] border-studio-border
                ${direction === 'horizontal' ? 'border-l border-r border-opacity-0 hover:border-opacity-100' : 'border-t border-b border-opacity-0 hover:border-opacity-100'}
            `}
            onMouseDown={onMouseDown}
        >
            {/* Visible Handle Indicator on Hover */}
            <div className={`
                bg-studio-text opacity-0 group-hover:opacity-30 rounded-full transition-opacity
                ${direction === 'horizontal' ? 'w-0.5 h-8' : 'h-0.5 w-8'}
            `}></div>
        </div>
    );
};

export default Resizer;
