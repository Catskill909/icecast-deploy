export default function ProgressBar({ 
  value, 
  max = 100, 
  size = 'md',
  showLabel = false,
  color = 'blue',
  className = '' 
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colors = {
    blue: 'bg-[#4b7baf]',
    teal: 'bg-[#4a9b9f]',
    green: 'bg-[#4ade80]',
    yellow: 'bg-[#fbbf24]',
    red: 'bg-[#f87171]',
    auto: percentage > 80 ? 'bg-[#f87171]' : percentage > 60 ? 'bg-[#fbbf24]' : 'bg-[#4ade80]',
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-[#2d3555] rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-[#64748b]">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}
