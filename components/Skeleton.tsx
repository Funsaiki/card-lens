/** Reusable skeleton loader primitives */

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`bg-white/[0.06] rounded animate-pulse ${className ?? ""}`}
    />
  );
}

/** Single card placeholder */
export function SkeletonCard() {
  return (
    <div className="aspect-[2.5/3.5] bg-zinc-800/50 rounded-lg border border-white/[0.04] animate-pulse" />
  );
}

/** Grid of card placeholders */
export function SkeletonCardGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Portfolio value card placeholder */
export function SkeletonPortfolio() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3 animate-pulse">
      <Bone className="h-3 w-24" />
      <Bone className="h-8 w-32" />
      <div className="flex gap-3 mt-2">
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-20" />
      </div>
      <Bone className="h-2 w-full rounded-full mt-2" />
    </div>
  );
}

/** Stats panel placeholder */
export function SkeletonStats() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <Bone className="h-2.5 w-16" />
            <Bone className="h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Game cards grid placeholder (collection dashboard) */
export function SkeletonDashboard() {
  return (
    <div className="space-y-4 animate-pulse">
      <SkeletonPortfolio />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <Bone className="w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-24" />
              <Bone className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Search results placeholder */
export function SkeletonSearchResults({ count = 4 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <Bone className="w-12 h-[66px] rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-32" />
            <Bone className="h-2.5 w-20" />
            <Bone className="h-2.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Set collection stats bar placeholder */
export function SkeletonSetStats() {
  return (
    <div className="px-4 py-3 animate-pulse space-y-2">
      <div className="flex justify-between">
        <Bone className="h-2.5 w-20" />
        <Bone className="h-2.5 w-8" />
      </div>
      <Bone className="h-1.5 w-full rounded-full" />
    </div>
  );
}
