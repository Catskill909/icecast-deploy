import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Delete',
    message = 'Are you sure you want to delete this item?',
    confirmText = 'Delete',
    confirmVariant = 'danger', // 'danger' | 'primary'
    itemName = null
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

    const confirmButtonStyles = confirmVariant === 'danger'
        ? 'bg-red-500/90 hover:bg-red-500 text-white'
        : 'bg-[#4b7baf] hover:bg-[#5d8dc0] text-white';

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#12182b] rounded-2xl w-full max-w-md shadow-2xl border border-[#2d3555] transform animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2337]">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${confirmVariant === 'danger' ? 'bg-red-500/15' : 'bg-[#4b7baf]/15'}`}>
                            {confirmVariant === 'danger' ? (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : (
                                <Trash2 className="w-5 h-5 text-[#4b7baf]" />
                            )}
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
                    <p className="text-[#c8d0df]">{message}</p>

                    {itemName && (
                        <div className="mt-4 px-4 py-3 bg-[#1e2337]/70 rounded-xl border border-[#2d3555]">
                            <p className="text-white font-medium truncate">{itemName}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 py-4 border-t border-[#1e2337]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#1e2337] text-[#c8d0df] hover:bg-[#2d3555] font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${confirmButtonStyles}`}
                    >
                        <Trash2 className="w-4 h-4" />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
