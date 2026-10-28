import { AppShell } from "@/components/app-shell";
import { MaterialsLibrary } from "@/components/materials-library";
import { createDemoWorkspaceAction } from "@/app/onboarding/actions";
import { requireUser } from "@/lib/auth";
import { listLessonPlans, listMaterials, listStudents } from "@/lib/supabase/teaching-data";

export default async function MaterialsPage() {
  await requireUser();
  const [{ materials, error: materialsError }, { students, error: studentsError }, { lessons, error: lessonsError }] = await Promise.all([
    listMaterials(),
    listStudents(),
    listLessonPlans()
  ]);
  const error = materialsError || studentsError || lessonsError;
  const isFirstUseEmpty = students.length === 0 && lessons.length === 0 && materials.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">Materials Library</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Reusable generated materials</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Search, tag, preview, and reuse saved teaching materials by type, level, student, and favorites.
          </p>
        </header>
        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}
        {isFirstUseEmpty ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#FF4F7B]">No materials yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Generate your first material or load a realistic demo workspace to explore reusable materials immediately.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={createDemoWorkspaceAction}>
                <button className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
                  Load Demo Workspace
                </button>
              </form>
            </div>
          </section>
        ) : null}
        <MaterialsLibrary materials={materials} students={students} />
      </div>
    </AppShell>
  );
}
