import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm bg-white/10", // Dark mode friendly base
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };