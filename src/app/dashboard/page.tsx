import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, CalendarCheck, Clock, Library, Plus, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { listLessonPlans, listMaterials, listStudents } from "@/lib/supabase/teaching-data";
import { createDemoWorkspaceAction } from "@/app/onboarding/actions";

export default async function DashboardPage() {
  await requireUser();
  const [{ students, error }, { lessons }, { materials }] = await Promise.all([listStudents(), listLessonPlans(), listMaterials()]);
  const vocabularyCount = students.reduce((total, student) => total + student.vocabularyToReview.length, 0);
  const plannedThisWeek = lessons.filter((lesson) => lesson.status === "planned").length;
  const completedThisWeek = lessons.filter((lesson) => lesson.status === "completed").length;
  const thisWeekWindow = new Date();
  const next7 = new Date(thisWeekWindow);
  next7.setDate(next7.getDate() + 7);
  const upcomingThisWeek = lessons.filter((lesson) => {
    const date = new Date(`${lesson.rawDate}T00:00:00`);
    return date >= thisWeekWindow && date <= next7;
  }).length;
  const recentActivity = [
    ...materials.slice(0, 3).map((material) => ({
      label: `Material saved: ${material.title}`,
      detail: `${material.studentName} · ${material.createdAt}`
    })),
    ...lessons.slice(0, 3).map((lesson) => ({
      label: `Lesson ${lesson.status}: ${lesson.title}`,
      detail: `${lesson.studentName} · ${lesson.date}`
    }))
  ].slice(0, 5);

  const summaryCards = [
    {
      label: "Total students",
      value: students.length,
      icon: Users,
      detail: "Active online learners"
    },
    {
      label: "Lessons planned this week",
      value: plannedThisWeek,
      icon: CalendarCheck,
      detail: "Saved lesson records"
    },
    {
      label: "Materials created",
      value: materials.length,
      icon: Library,
      detail: "Saved in Supabase"
    },
    {
      label: "Vocabulary items to review",
      value: vocabularyCount,
      icon: BookOpen,
      detail: "From student memory"
    }
  ];
  const quickStart = [
    { label: "Create a student", done: students.length > 0, href: "/students/new" as Route, cta: students.length > 0 ? "Add another" : "Create first" },
    { label: "Generate speaking questions", done: students.length > 0, href: "/ai-generator?type=speaking" as Route, cta: "Generate" },
    { label: "Save material", done: materials.length > 0, href: "/ai-generator" as Route, cta: "Generate + save" },
    { label: "Open Materials Library", done: materials.length > 0, href: "/materials" as Route, cta: "Open library" }
  ];
  const isFirstUseEmpty = students.length === 0 && lessons.length === 0 && materials.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Teacher workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Your week, ready at a glance.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Track upcoming lessons, recent materials, review vocabulary, and the next useful action for every learner.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/lesson-planner"
                className="btn-primary"
              >
                Plan next lesson
              </Link>
              <Link
                href="/ai-generator"
                className="btn-secondary"
              >
                Generate material
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}

        {isFirstUseEmpty ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#FF4F7B]">Try Demo Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1F2937]">Understand LessonFlow in 30 seconds</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Load realistic students, materials, completed lessons, planned lessons, and weekly prep suggestions so the workspace feels immediately useful.
            </p>
            <form action={createDemoWorkspaceAction} className="mt-4">
              <button className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
                Load Demo Workspace
              </button>
            </form>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, detail }) => (
            <article key={label} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-[#1F2937]">{value}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-2xl bg-[#FFF5F8] text-[#FF4F7B]">
                  <Icon size={22} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600">{detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1F2937]">Weekly overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FFF5F8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming (7 days)</p>
              <p className="mt-1 text-2xl font-semibold text-[#1F2937]">{upcomingThisWeek}</p>
            </div>
            <div className="rounded-2xl bg-[#FFF5F8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned</p>
              <p className="mt-1 text-2xl font-semibold text-[#1F2937]">{plannedThisWeek}</p>
            </div>
            <div className="rounded-2xl bg-[#FFF5F8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-[#1F2937]">{completedThisWeek}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1F2937]">Quick start checklist</h2>
              <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-xs font-semibold text-[#FF4F7B]">
                {quickStart.filter((item) => item.done).length}/4 done
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {quickStart.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#FFF5F8] p-3 text-sm text-slate-700">
                  <span className={item.done ? "font-semibold text-emerald-700" : "font-medium text-slate-700"}>{item.label}</span>
                  <Link href={item.href} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#FF4F7B]">
                    {item.cta}
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1F2937]">Demo workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create realistic demo students, materials, planned lessons, completed lessons, and weekly prep instantly.
            </p>
            <form action={createDemoWorkspaceAction} className="mt-4">
              <button className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
                Load Demo Workspace
              </button>
            </form>
            <Link href="/weekly-prep" className="mt-3 inline-flex text-sm font-semibold text-[#FF4F7B]">
              Open weekly prep shortcut
            </Link>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1F2937]">Upcoming lessons</h2>
              <Link href="/lesson-planner" className="text-sm font-semibold text-[#FF4F7B]">Open planner</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {lessons.length > 0 ? (
                lessons.slice(0, 4).map((lesson) => (
                  <Link
                    href="/lesson-planner"
                    key={lesson.id}
                    className="rounded-2xl bg-[#FFF5F8] p-4 transition hover:bg-rose-100"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#1F2937]">{lesson.title}</p>
                      <span className={`status-badge ${lesson.status === "completed" ? "status-completed" : "status-planned"}`}>
                        {lesson.status === "completed" ? "Completed" : "Planned"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{lesson.studentName} · {lesson.date} · {lesson.skillFocus || lesson.focus}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-[#FFF5F8] p-5 text-sm text-slate-600">
                  No lessons planned yet.
                  <Link href="/lesson-planner" className="ml-1 font-semibold text-[#FF4F7B]">Create your first lesson</Link>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1F2937]">Recent activity</h2>
              <Clock className="text-[#FF4F7B]" size={21} aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={`${activity.label}-${activity.detail}`} className="rounded-2xl bg-[#FFF5F8] p-3">
                    <p className="text-sm font-semibold text-[#1F2937]">{activity.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{activity.detail}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#FFF5F8] p-4 text-sm text-slate-600">Create a student or generate material to start the activity feed.</p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr,1fr]">
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <Sparkles className="text-[#FF4F7B]" size={24} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[#1F2937]">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              {[
                ["/students/new", "Create student", Plus],
                ["/ai-generator", "Generate material", Sparkles],
                ["/weekly-prep", "Prepare this week", CalendarCheck]
              ].map(([href, label, Icon]) => (
                <Link key={String(label)} href={href as Route} className="flex items-center justify-between rounded-2xl bg-[#FFF5F8] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-rose-100 hover:text-[#FF4F7B]">
                  <span className="flex items-center gap-2">
                    <Icon size={17} aria-hidden="true" />
                    {String(label)}
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1F2937]">Next student focus</h2>
            <div className="mt-4 grid gap-3">
              {students.length > 0 ? (
                students.slice(0, 3).map((student) => (
                  <Link href={`/students/${student.id}` as Route} key={student.id} className="rounded-2xl bg-[#FFF5F8] p-4 transition hover:bg-rose-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#1F2937]">{student.name}</p>
                      <span className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{student.level}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{student.nextSuggestedFocus}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-[#FFF5F8] p-5 text-sm text-slate-600">
                  No students yet.
                  <Link href="/students/new" className="ml-1 font-semibold text-[#FF4F7B]">Create your first student</Link>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
