import { AppShell } from "@/components/app-shell";
import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function AiGeneratorLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <LoadingSkeleton className="h-24 rounded-3xl" />
        <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
          <LoadingSkeleton className="h-[560px] rounded-3xl" />
          <LoadingSkeleton className="h-[560px] rounded-3xl" />
        </div>
      </div>
    </AppShell>
  );
}
