export function Card({ children, className = '', hover = false, glass = false }) {
  return (
    <div
      className={`
        rounded-2xl border border-[#2d3555] relative
        ${glass ? 'glass' : 'bg-[#1e2337]'}
        ${hover ? 'hover:bg-[#252b45] hover:border-[#3d4565] transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-b border-[#2d3555] ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`font-semibold text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-[#94a3b8] mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-t border-[#2d3555] ${className}`}>
      {children}
    </div>
  );
}
