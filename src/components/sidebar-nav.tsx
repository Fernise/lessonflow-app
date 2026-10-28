"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CalendarDays, Home, Library, MessageCircle, NotebookTabs, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const iconsByHref: Record<string, LucideIcon> = {
    "/dashboard": Home,
    "/students": Users,
    "/lesson-planner": NotebookTabs,
    "/weekly-prep": CalendarDays,
    "/materials": Library,
    "/ai-generator": Sparkles,
    "/feedback": MessageCircle,
    "/settings": Settings
  };

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/lesson-planner") {
      return pathname === "/lesson-planner" || pathname.startsWith("/lesson-planner/") || pathname === "/lessons" || pathname.startsWith("/lessons/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function getNavTestId(href: string) {
    if (href === "/dashboard") return "nav-dashboard";
    if (href === "/students") return "nav-students";
    if (href === "/materials") return "nav-materials";
    if (href === "/ai-generator") return "nav-ai-generator";
    if (href === "/weekly-prep") return "nav-weekly-prep";
    if (href === "/lesson-planner") return "nav-lesson-planner";
    if (href === "/feedback") return "nav-feedback";
    if (href === "/settings") return "nav-settings";
    return undefined;
  }

  return (
    <nav className="grid gap-1">
      {items.map(({ href, label }) => {
        const Icon = iconsByHref[href] || Home;
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href as Route}
            data-testid={getNavTestId(href)}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              active
                ? "bg-rose-50 text-[#FF4F7B] shadow-sm"
                : "text-slate-700 hover:bg-rose-50 hover:text-[#FF4F7B]"
            }`}
          >
            {active ? <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#FF4F7B]" /> : null}
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
