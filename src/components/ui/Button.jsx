const variants = {
  primary: 'bg-[#4b7baf] hover:bg-[#5d8aa8] text-white',
  secondary: 'bg-[#1e2337] hover:bg-[#252b45] text-white border border-[#2d3555]',
  success: 'bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] border border-[#4ade80]/30',
  danger: 'bg-[#f87171]/20 hover:bg-[#f87171]/30 text-[#f87171] border border-[#f87171]/30',
  warning: 'bg-[#fbbf24]/20 hover:bg-[#fbbf24]/30 text-[#fbbf24] border border-[#fbbf24]/30',
  ghost: 'hover:bg-[#1e2337] text-[#94a3b8] hover:text-white',
};

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" />
      )}
    </button>
  );
}
