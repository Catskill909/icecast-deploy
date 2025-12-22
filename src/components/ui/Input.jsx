export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
        )}
        <input
          className={`
            w-full bg-[#1e2337] border rounded-lg px-4 py-2.5 text-sm text-white
            placeholder-[#64748b] transition-colors
            focus:outline-none focus:border-[#4b7baf]
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-[#f87171]' : 'border-[#2d3555]'}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#f87171]">{error}</p>
      )}
    </div>
  );
}

export function Select({ label, error, options, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-[#1e2337] border rounded-lg px-4 py-2.5 text-sm text-white
          transition-colors cursor-pointer
          focus:outline-none focus:border-[#4b7baf]
          ${error ? 'border-[#f87171]' : 'border-[#2d3555]'}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-[#f87171]">{error}</p>
      )}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-[#1e2337] border rounded-lg px-4 py-2.5 text-sm text-white
          placeholder-[#64748b] transition-colors resize-none
          focus:outline-none focus:border-[#4b7baf]
          ${error ? 'border-[#f87171]' : 'border-[#2d3555]'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[#f87171]">{error}</p>
      )}
    </div>
  );
}
