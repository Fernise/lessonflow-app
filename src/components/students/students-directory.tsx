"use client";

import Link from "next/link";
import type { Route } from "next";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { listStudents } from "@/lib/supabase/teaching-data";

type Student = Awaited<ReturnType<typeof listStudents>>["students"][number];

export function StudentsDirectory({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return students;
    return students.filter((student) =>
      [
        student.name,
        student.level,
        student.nativeLanguage,
        student.goals.join(" "),
        student.notes,
        student.nextSuggestedFocus
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [query, students]);

  return (
    <div className="space-y-4">
      <label className="relative block rounded-3xl border border-rose-100 bg-white p-3 shadow-sm">
        <Search className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students by name, level, goals, notes..."
          className="w-full rounded-2xl border border-rose-100 bg-white py-2.5 pl-10 pr-10 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-[#FF4F7B]"
            aria-label="Clear search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </label>

      {filtered.length === 0 ? (
        <section className="rounded-3xl border border-rose-100 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          No results found
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.1fr,0.45fr,0.75fr,1.2fr,0.8fr,1.3fr,0.7fr] gap-4 border-b border-rose-100 bg-[#FFF5F8] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <span>Name</span>
            <span>Level</span>
            <span>Language</span>
            <span>Goals</span>
            <span>Last lesson</span>
            <span>Next focus</span>
            <span>Profile</span>
          </div>
          <div className="divide-y divide-rose-100">
            {filtered.map((student) => (
              <article
                key={student.id}
                className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.1fr,0.45fr,0.75fr,1.2fr,0.8fr,1.3fr,0.7fr] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-[#1F2937]">{student.name}</p>
                  <p className="mt-1 text-xs text-slate-500 lg:hidden">{student.lastLesson}</p>
                </div>
                <span className="w-fit rounded-xl bg-[#FFF5F8] px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{student.level}</span>
                <p className="text-slate-600">{student.nativeLanguage || "Not set"}</p>
                <p className="text-slate-600">{student.goals.join("; ") || "No goals yet"}</p>
                <p className="hidden text-slate-600 lg:block">{student.lastLesson}</p>
                <p className="text-slate-600">{student.nextSuggestedFocus}</p>
                <Link
                  href={`/students/${student.id}` as Route}
                  className="flex w-fit items-center gap-2 rounded-xl bg-[#FF4F7B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E63E69]"
                >
                  View profile
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
