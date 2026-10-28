"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FileText, Search, Users } from "lucide-react";
import type { LessonPlanSummary, TeachingMaterial, TeachingStudent } from "@/lib/teaching-types";

type SearchItem = {
  id: string;
  type: "Student" | "Material" | "Lesson";
  title: string;
  description: string;
  href: Route;
};

export function GlobalSearch({
  students,
  materials,
  lessons
}: {
  students: TeachingStudent[];
  materials: TeachingMaterial[];
  lessons: LessonPlanSummary[];
}) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsFocused(false);
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  const items = useMemo<SearchItem[]>(
    () => [
      ...students.map((student) => ({
        id: `student-${student.id}`,
        type: "Student" as const,
        title: student.name,
        description: `${student.level} · ${student.nextSuggestedFocus}`,
        href: `/students/${student.id}` as Route
      })),
      ...materials.map((material) => ({
        id: `material-${material.id}`,
        type: "Material" as const,
        title: material.title,
        description: `${material.level} · ${material.topic} · ${material.studentName}`,
        href: "/materials" as Route
      })),
      ...lessons.map((lesson) => ({
        id: `lesson-${lesson.id}`,
        type: "Lesson" as const,
        title: lesson.title,
        description: `${lesson.studentName} · ${lesson.date} · ${lesson.status}`,
        href: "/lesson-planner" as Route
      }))
    ],
    [students, materials, lessons]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const value = query.toLowerCase();
    return items.filter((item) => `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(value)).slice(0, 8);
  }, [items, query]);

  return (
    <div className="relative">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
            blurTimerRef.current = window.setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder="Search students, lessons, materials..."
          className="w-full rounded-2xl border border-rose-100 bg-white py-2.5 pl-10 pr-3 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
        />
      </label>
      {isFocused && query.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xl">
          {results.length > 0 ? (
            results.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-3 border-b border-rose-50 px-3 py-3 transition last:border-0 hover:bg-[#FFF5F8]"
              >
                <SearchIcon type={item.type} />
                <span>
                  <span className="block text-sm font-semibold text-[#1F2937]">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{item.type} · {item.description}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-slate-600">No results found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ type }: { type: SearchItem["type"] }) {
  const Icon = type === "Student" ? Users : type === "Lesson" ? CalendarDays : type === "Material" ? FileText : BookOpen;
  return (
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#FFF5F8] text-[#FF4F7B]">
      <Icon size={16} aria-hidden="true" />
    </span>
  );
}
