import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { listLessonPlans } from "@/lib/supabase/teaching-data";

export default async function LessonsPage() {
  await requireUser();
  const { lessons, error } = await listLessonPlans();

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#FF4F7B]">Lessons</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Saved lesson records</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              This is where every created lesson is stored and visible after refresh.
            </p>
          </div>
          <Link
            href="/lesson-planner"
            className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
          >
            Create lesson
          </Link>
        </header>

        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}

        {lessons.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#1F2937]">No lessons saved yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Create your first lesson in Lesson Planner, then it will appear here automatically.
            </p>
            <Link
              href="/lesson-planner"
              className="mt-5 inline-flex rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
            >
              Open Lesson Planner
            </Link>
          </section>
        ) : (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="grid gap-3">
              {lessons.map((lesson) => (
                <article key={lesson.id} className="rounded-2xl bg-[#FFF5F8] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-[#1F2937]">{lesson.title}</p>
                    <span className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{lesson.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {lesson.studentName} · {lesson.studentLevel} · {lesson.date} · {lesson.durationMinutes} min
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Topic: {lesson.topic || "N/A"} · Focus: {lesson.skillFocus || lesson.focus || "N/A"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
