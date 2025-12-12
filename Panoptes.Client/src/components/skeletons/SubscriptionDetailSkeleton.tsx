import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryLogsTableSkeleton } from "./DeliveryLogsTableSkeleton";

export function SubscriptionDetailSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" /> {/* H1 Title */}
          <Skeleton className="h-4 w-96 opacity-50" /> {/* Breadcrumbs/ID */}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" /> {/* Edit Button */}
          <Skeleton className="h-10 w-10" /> {/* Icon Button */}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-sm border border-white/10 bg-[#050505] p-6 space-y-3">
            <Skeleton className="h-4 w-24 opacity-50" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Main Content Area (e.g., Logs or Webhook Details) */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" /> {/* Section Title */}
        <DeliveryLogsTableSkeleton />
      </div>
    </div>
  );
}