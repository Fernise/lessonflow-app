import { AppShell } from "@/components/app-shell";

export default function WeeklyPrepLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-3xl bg-white" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
    </AppShell>
  );
}
