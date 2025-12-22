export default function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {label && <span className="text-sm font-medium text-white">{label}</span>}
        {description && (
          <p className="text-xs text-[#64748b] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          ${enabled ? 'bg-[#4b7baf]' : 'bg-[#2d3555]'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
