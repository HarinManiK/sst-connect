import { Skeleton } from "@/components/EmptyState";

// Shown instantly on every tab switch while the target page's data streams
// in, so navigation feels immediate instead of blocking on the server.
export default function AppLoading() {
  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center border-b border-border bg-surface px-4 py-3.5">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
