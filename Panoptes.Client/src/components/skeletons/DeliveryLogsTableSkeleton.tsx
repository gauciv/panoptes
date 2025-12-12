import { Skeleton } from "@/components/ui/skeleton";

export function DeliveryLogsTableSkeleton() {
  return (
    <div className="w-full rounded-sm border border-white/10 bg-[#050505]">
      {/* Table Header */}
      <div className="flex items-center gap-4 border-b border-white/10 bg-white/5 p-4">
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-auto flex-1" />
      </div>

      {/* Table Rows (x5) */}
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-4 border-b border-white/5 p-4 last:border-0"
        >
          {/* Status Icon */}
          <Skeleton className="h-8 w-8 rounded-full opacity-20" /> 
          
          {/* Endpoint */}
          <div className="w-1/4 space-y-1">
             <Skeleton className="h-3 w-3/4" />
             <Skeleton className="h-2 w-1/2 opacity-50" />
          </div>

          {/* Timestamp */}
          <Skeleton className="h-3 w-1/6 opacity-60" />

          {/* Latency */}
          <Skeleton className="h-3 w-1/6 opacity-60" />

          {/* Action */}
          <Skeleton className="h-8 w-20 ml-auto rounded-sm opacity-20" />
        </div>
      ))}
    </div>
  );
}