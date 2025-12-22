import { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toast({ type = 'info', title, message, onClose }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'border-[#4ade80]/30 bg-[#4ade80]/10',
    error: 'border-[#f87171]/30 bg-[#f87171]/10',
    warning: 'border-[#fbbf24]/30 bg-[#fbbf24]/10',
    info: 'border-[#4b7baf]/30 bg-[#4b7baf]/10',
  };

  const iconColors = {
    success: 'text-[#4ade80]',
    error: 'text-[#f87171]',
    warning: 'text-[#fbbf24]',
    info: 'text-[#4b7baf]',
  };

  const Icon = icons[type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
        min-w-[320px] max-w-md shadow-lg
        animate-in slide-in-from-right fade-in duration-300
        ${colors[type]}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[type]}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-white text-sm">{title}</p>}
        {message && (
          <p className="text-sm text-[#94a3b8] mt-0.5">{message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-[#64748b] hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
