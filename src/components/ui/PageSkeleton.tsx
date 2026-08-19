const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-neutral-800 rounded-sm ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-shimmer" />
  </div>
);

export const PageSkeleton = () => (
  <div className="container-custom py-12 space-y-12">
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
      <div className="space-y-4">
        <SkeletonBlock className="aspect-[3/4] w-full rounded-2xl" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="w-20 h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-6 pt-4">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-8 w-3/4" />
        <SkeletonBlock className="h-8 w-1/3" />
        <div className="flex gap-2 pt-4">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2">
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
        </div>
        <div className="flex gap-4 pt-4">
          <SkeletonBlock className="h-14 flex-1" />
          <SkeletonBlock className="h-14 flex-1" />
        </div>
      </div>
    </div>
    <div className="space-y-6">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="h-4 w-4/6" />
    </div>
  </div>
);

export const ProductDetailSkeleton = () => (
  <div className="container-custom py-4 pb-20">
    <SkeletonBlock className="h-4 w-64 mb-8" />
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
      <div className="space-y-4">
        <SkeletonBlock className="aspect-[3/4] w-full rounded-2xl" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="w-20 h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-6 pt-4">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-8 w-3/4" />
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-8 w-1/3" />
        <div className="flex gap-2 pt-4">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
        <SkeletonBlock className="h-4 w-16 pt-4" />
        <div className="flex flex-wrap gap-2.5">
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
          <SkeletonBlock className="h-12 w-14 rounded-lg" />
        </div>
        <div className="flex gap-4 pt-4">
          <SkeletonBlock className="h-14 flex-1" />
          <SkeletonBlock className="h-14 flex-1" />
        </div>
      </div>
    </div>
  </div>
);
