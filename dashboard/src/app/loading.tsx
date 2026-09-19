import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shape-matched placeholder: a page header, a row of four tiles and two
 * panels. Feature routes with a different shape should ship their own
 * loading.tsx rather than reusing this one.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[6.5rem] rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Skeleton className="h-56 rounded-lg lg:col-span-7" />
        <Skeleton className="h-56 rounded-lg lg:col-span-5" />
      </div>
    </div>
  );
}
