import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, content, side = 'right' }) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);

    // Update coordinates when showing
    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();

            // Calculate position based on side
            // Defaulting to 'right' logic for sidebar
            if (side === 'right') {
                setCoords({
                    top: rect.top + (rect.height / 2),
                    left: rect.right + 12 // 12px gap
                });
            }
        }
    }, [isVisible, side]);

    if (!content) return <div className="w-full">{children}</div>;

    return (
        <div
            ref={triggerRef}
            className="w-full"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            {isVisible && createPortal(
                <div
                    className="fixed z-[100] px-3 py-1.5 text-sm font-medium text-white bg-[#1e2337] border border-[#2d3555] rounded-md shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        transform: 'translateY(-50%)' // Center vertically
                    }}
                >
                    {content}
                    {/* Arrow (pointing left) */}
                    <div className="absolute w-2 h-2 bg-[#1e2337] border-l border-b border-[#2d3555] rotate-45 -left-1 top-1/2 -translate-y-1/2" />
                </div>,
                document.body
            )}
        </div>
    );
}
