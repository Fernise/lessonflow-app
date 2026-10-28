import type { Route } from "next";
import { BookOpenCheck, CalendarDays, Home, Library, MessageCircle, NotebookTabs, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";
import { AppHeader } from "./app-header";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { ToastProvider } from "./toast-provider";
import { BetaFeedbackButton } from "./beta-feedback-button";

const navItems: Array<{
  href: Route;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/students", label: "Students", icon: Users },
  { href: "/lesson-planner", label: "Lesson Planner", icon: NotebookTabs },
  { href: "/weekly-prep", label: "Weekly Prep", icon: CalendarDays },
  { href: "/materials", label: "Materials Library", icon: Library },
  { href: "/ai-generator", label: "AI Generator", icon: Sparkles },
  { href: "/feedback", label: "Feedback", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings }
];

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader action={<SignOutButton />} homeHref="/dashboard" />
      <ToastProvider />
      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[250px,1fr]">
        <aside className="h-fit rounded-2xl border border-rose-100 bg-white p-3 shadow-soft lg:sticky lg:top-6">
          <SidebarNav items={navItems.map((item) => ({ href: String(item.href), label: item.label }))} />
          <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-4">
            <BookOpenCheck className="text-[#FF4F7B]" size={22} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Teaching memory</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Student profiles, previous lessons, and review items feed the AI workspace.
            </p>
          </div>
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Welcome to LessonFlow Beta</p>
              <p className="mt-1 text-sm text-slate-600">We are polishing the workspace with real tutor feedback.</p>
            </div>
            <BetaFeedbackButton />
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
