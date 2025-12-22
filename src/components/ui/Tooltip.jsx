import { useState } from 'react';

export default function Tooltip({ children, content, side = 'right' }) {
    const [isVisible, setIsVisible] = useState(false);

    if (!content) return children;

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            {isVisible && (
                <div className={`
          absolute z-50 px-3 py-1.5 
          text-sm font-medium text-white bg-[#1e2337] 
          border border-[#2d3555] rounded-md shadow-lg
          whitespace-nowrap animate-in fade-in zoom-in-95 duration-150
          ${side === 'right' ? 'left-full ml-3' : ''}
          ${side === 'top' ? 'bottom-full mb-2' : ''}
          ${side === 'bottom' ? 'top-full mt-2' : ''}
        `}>
                    {content}
                    {/* Arrow */}
                    <div className={`
            absolute w-2 h-2 bg-[#1e2337] border-l border-b border-[#2d3555] rotate-45
            ${side === 'right' ? '-left-1 top-1/2 -translate-y-1/2' : ''}
          `} />
                </div>
            )}
        </div>
    );
}
