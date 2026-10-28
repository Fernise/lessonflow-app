import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2, Database, GraduationCap, Lightbulb, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { isDevSeedEnabled, listLessonPlans, listMaterials, listStudents } from "@/lib/supabase/teaching-data";
import { seedSampleStudentsAction } from "@/app/students/actions";
import { createDemoWorkspaceAction } from "./actions";

export default async function OnboardingPage() {
  await requireUser();
  const [{ students }, { materials }, { lessons }] = await Promise.all([listStudents(), listMaterials(), listLessonPlans()]);
  const hasStudents = students.length > 0;
  const hasMaterials = materials.length > 0;
  const hasLesson = lessons.length > 0;
  const checklist = [
    { done: hasStudents, label: "Create a student", href: "/students/new", cta: hasStudents ? "Add another student" : "Create your first student" },
    { done: hasStudents, label: "Generate speaking questions", href: "/ai-generator?type=speaking", cta: "Generate speaking questions" },
    { done: hasMaterials, label: "Save material", href: "/ai-generator", cta: "Generate and save material" },
    { done: hasMaterials, label: "Open Materials Library", href: "/materials", cta: "Open Materials Library" }
  ] as const;
  const progress = checklist.filter((item) => item.done).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-[#FF4F7B]">Welcome to LessonFlow</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Set up your teaching workspace.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A few quick steps will give the AI enough context to generate useful material for real online lessons.
          </p>
          <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-3 text-sm text-slate-700">
            Setup progress: <span className="font-semibold text-[#1F2937]">{progress}/4</span> steps completed
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <OnboardingStep
            done={hasStudents}
            icon={<GraduationCap size={22} aria-hidden="true" />}
            title="Create your first student"
            text="Add level, goals, interests, and recurring mistakes so the workspace can personalize outputs."
            actionHref="/students/new"
            actionLabel={hasStudents ? "Add another student" : "Create first student"}
          />
          <OnboardingStep
            done={hasMaterials}
            icon={<Sparkles size={22} aria-hidden="true" />}
            title="Generate first useful material"
            text="Use AI Generator with Speaking Questions to create a practical first output in under a minute."
            actionHref="/ai-generator?type=speaking"
            actionLabel="Generate speaking questions"
          />
          <OnboardingStep
            done={hasLesson}
            icon={<Lightbulb size={22} aria-hidden="true" />}
            title="Plan your first lesson"
            text="Move from generated material into Lesson Planner and keep teaching flow reusable week to week."
            actionHref="/lesson-planner"
            actionLabel="Plan first lesson"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1F2937]">Quick start checklist</h2>
            <div className="mt-4 grid gap-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-[#FFF5F8] p-3 text-sm text-slate-700">
                  <div className="flex gap-3">
                    <CheckCircle2 className={`mt-0.5 shrink-0 ${item.done ? "text-emerald-600" : "text-[#FF4F7B]"}`} size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  <Link href={item.href as Route} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#FF4F7B]">
                    {item.cta}
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <Database className="text-[#FF4F7B]" size={24} aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[#1F2937]">Demo workspace mode</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Create a full starter workspace instantly for demos or first-run exploration.</p>
            <form action={createDemoWorkspaceAction} className="mt-4">
              <button className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
                Create demo workspace
              </button>
            </form>
            {isDevSeedEnabled() ? (
              <form action={seedSampleStudentsAction} className="mt-3">
                <button className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]">
                  Load local sample data
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-2xl bg-[#FFF5F8] p-3 text-xs text-slate-600">Demo workspace will not overwrite existing students.</p>
            )}
          </article>
        </section>
      </div>
    </AppShell>
  );
}

function OnboardingStep({
  done,
  icon,
  title,
  text,
  actionHref,
  actionLabel
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
  actionHref: Route;
  actionLabel: string;
}) {
  return (
    <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#FFF5F8] text-[#FF4F7B]">{icon}</span>
        {done ? <span className="rounded-xl bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Done</span> : null}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#1F2937]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <Link
        href={actionHref}
        title={`Open ${title}`}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
      >
        {actionLabel}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
