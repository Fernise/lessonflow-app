import { AppShell } from "@/components/app-shell";
import { LessonPlannerBoard } from "@/components/lesson-planner-board";
import { createDemoWorkspaceAction } from "@/app/onboarding/actions";
import { requireUser } from "@/lib/auth";
import { listLessonPlans, listMaterials, listStudents } from "@/lib/supabase/teaching-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LessonPlannerPage() {
  await requireUser();
  const [{ students, error: studentsError }, { materials, error: materialsError }, { lessons, error: lessonsError }] =
    await Promise.all([listStudents(), listMaterials(), listLessonPlans()]);
  const error = studentsError || materialsError || lessonsError;
  const isFirstUseEmpty = students.length === 0 && lessons.length === 0 && materials.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">Lesson Planner</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Weekly lesson planning</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Plan upcoming lessons using student data, teaching memory, and saved materials.
          </p>
        </header>
        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}
        {isFirstUseEmpty ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#FF4F7B]">No lessons planned</p>
            <p className="mt-2 text-sm text-slate-600">
              Create your first lesson manually, or load demo data to preview planned and completed lesson workflows.
            </p>
            <form action={createDemoWorkspaceAction} className="mt-4">
              <button className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
                Load Demo Workspace
              </button>
            </form>
          </section>
        ) : null}
        <LessonPlannerBoard students={students} materials={materials} lessons={lessons} />
      </div>
    </AppShell>
  );
}
