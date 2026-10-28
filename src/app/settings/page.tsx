import { AppShell } from "@/components/app-shell";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const { user } = await requireUser();

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Workspace preferences</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manage your account, workspace defaults, legal links, and beta feedback.
          </p>
        </header>
        <SettingsWorkspace email={user.email || ""} />
      </div>
    </AppShell>
  );
}
