import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      'rounded-md bg-[#0a0a0a] bg-gradient-to-r from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] bg-[length:200%_100%] animate-shimmer',
      className
    )}
  />
);

export const ProductCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-square w-full rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const OrderSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="p-4 border border-border rounded-xl space-y-3">
        <div className="flex gap-4">
          <Skeleton className="w-20 h-24 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
