const statusStyles = {
  online: {
    bg: 'bg-[#4ade80]/20',
    text: 'text-[#4ade80]',
    dot: 'bg-[#4ade80]',
  },
  offline: {
    bg: 'bg-[#f87171]/20',
    text: 'text-[#f87171]',
    dot: 'bg-[#f87171]',
  },
  warning: {
    bg: 'bg-[#fbbf24]/20',
    text: 'text-[#fbbf24]',
    dot: 'bg-[#fbbf24]',
  },
  pending: {
    bg: 'bg-[#4b7baf]/20',
    text: 'text-[#4b7baf]',
    dot: 'bg-[#4b7baf]',
  },
};

export default function StatusBadge({ status, showDot = true, pulse = true, className = '' }) {
  const styles = statusStyles[status] || statusStyles.pending;
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${styles.bg} ${styles.text}
        ${className}
      `}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${styles.dot} ${
            pulse && status === 'online' ? 'animate-pulse-dot' : ''
          }`}
        />
      )}
      <span className="capitalize">{status}</span>
    </span>
  );
}
