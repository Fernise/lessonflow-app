import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#FFF5F8] p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <LoadingSkeleton className="h-36" />
        <div className="grid gap-4 md:grid-cols-4">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
        </div>
      </div>
    </main>
  );
}
