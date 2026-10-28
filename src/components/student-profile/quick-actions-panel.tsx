import Link from "next/link";
import type { Route } from "next";
import { ClipboardPlus, FileQuestion, MessageCircle, NotebookPen, Sparkles } from "lucide-react";
import type { TeachingStudent } from "@/lib/teaching-types";

type QuickActionsPanelProps = {
  student: TeachingStudent;
};

export function QuickActionsPanel({ student }: QuickActionsPanelProps) {
  const actions = [
    {
      label: "Generate lesson",
      href: `/ai-generator?student=${student.id}&type=lesson`,
      icon: Sparkles,
      primary: true
    },
    {
      label: "Generate speaking activity",
      href: `/ai-generator?student=${student.id}&type=speaking`,
      icon: MessageCircle
    },
    {
      label: "Generate quiz",
      href: `/ai-generator?student=${student.id}&type=quiz`,
      icon: FileQuestion
    },
    {
      label: "Add lesson notes",
      href: `/students/${student.id}#lesson-notes`,
      icon: NotebookPen
    },
    {
      label: "Plan next lesson",
      href: `/lesson-planner?student=${student.id}`,
      icon: ClipboardPlus
    }
  ];

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#FF4F7B]">Quick actions</p>
      <div className="mt-4 grid gap-2">
        {actions.map(({ label, href, icon: Icon, primary }) => (
          <Link
            key={label}
            href={href as Route}
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              primary
                ? "bg-[#FF4F7B] text-white hover:bg-[#E63E69]"
                : "border border-rose-100 bg-white text-slate-700 hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon size={17} aria-hidden="true" />
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
