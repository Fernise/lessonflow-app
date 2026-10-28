import { AppShell } from "@/components/app-shell";
import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function StudentsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <LoadingSkeleton className="h-24 rounded-3xl" />
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    </AppShell>
  );
}
