import Link from "next/link";
import type { Route } from "next";
import { GraduationCap } from "lucide-react";

type AppHeaderProps = {
  action?: React.ReactNode;
  homeHref?: Route;
};

export function AppHeader({ action, homeHref = "/" }: AppHeaderProps) {
  return (
    <header className="border-b border-rose-100 bg-white/90 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link
          href={homeHref}
          data-testid="logo-home-link"
          className="flex cursor-pointer items-center gap-2 rounded-xl px-1 py-1 font-semibold text-[#1F2937] transition hover:text-[#FF4F7B]"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-[#FF4F7B] text-white shadow-sm">
            <GraduationCap size={20} aria-hidden="true" />
          </span>
          <span>LessonFlow</span>
        </Link>
        {action}
      </div>
    </header>
  );
}
