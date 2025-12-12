import { Skeleton } from "@/components/ui/skeleton";

export function SubscriptionCardSkeleton() {
  return (
    <div className="rounded-sm border border-white/10 bg-[#050505] p-6">
      {/* Header: Title + Status Badge */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" /> {/* Title */}
          <Skeleton className="h-3 w-20 opacity-50" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-6 w-16 rounded-full" /> {/* Status Badge */}
      </div>

      {/* Body: Key/Value pairs */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24 opacity-40" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24 opacity-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24 opacity-40" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Footer: Action Button */}
      <div className="pt-4 border-t border-white/5">
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}