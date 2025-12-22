export default function Skeleton({ className = '', variant = 'rect' }) {
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`skeleton ${variants[variant]} ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#1e2337] rounded-xl border border-[#2d3555] p-5">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12" variant="circle" />
        <div className="flex-1">
          <Skeleton className="w-32 h-4 mb-2" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-20 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-8" />
        <Skeleton className="w-20 h-8" />
      </div>
    </div>
  );
}
