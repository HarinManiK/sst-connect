import { Skeleton } from "@/components/EmptyState";

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          </div>
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
