import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function AlertModal({
    isOpen,
    onClose,
    title = 'Alert',
    message,
    variant = 'error', // 'error' | 'success' | 'info'
}) {
    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const variants = {
        error: {
            bg: 'bg-red-500/15',
            icon: AlertCircle,
            iconColor: 'text-red-400',
            button: 'bg-red-500 hover:bg-red-600'
        },
        success: {
            bg: 'bg-green-500/15',
            icon: CheckCircle,
            iconColor: 'text-green-400',
            button: 'bg-green-500 hover:bg-green-600'
        },
        info: {
            bg: 'bg-blue-500/15',
            icon: Info,
            iconColor: 'text-blue-400',
            button: 'bg-blue-500 hover:bg-blue-600'
        }
    };

    const currentVariant = variants[variant] || variants.info;
    const Icon = currentVariant.icon;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#12182b] rounded-2xl w-full max-w-sm shadow-2xl border border-[#2d3555] transform animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2337]">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${currentVariant.bg}`}>
                            <Icon className={`w-5 h-5 ${currentVariant.iconColor}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1e2337] text-[#8896ab] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-[#c8d0df] leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="p-6 pt-2">
                    <button
                        onClick={onClose}
                        className={`w-full px-4 py-2.5 rounded-xl text-white font-medium transition-colors shadow-lg ${currentVariant.button}`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
