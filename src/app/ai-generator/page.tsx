import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AiGeneratorWorkspace } from "@/components/ai-generator-workspace";
import { requireUser } from "@/lib/auth";
import { listAiGenerations, listStudents } from "@/lib/supabase/teaching-data";

export default async function AiGeneratorPage() {
  await requireUser();
  const [{ students, error }, { generations, error: historyError }] = await Promise.all([listStudents(), listAiGenerations()]);

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">AI Generator</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Create personalized teaching material</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Build a material brief from student memory and generate structured materials with OpenAI.
          </p>
        </header>
        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}
        {historyError ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{historyError}</section>
        ) : null}
        <Suspense>
          <AiGeneratorWorkspace students={students} generations={generations} />
        </Suspense>
      </div>
    </AppShell>
  );
}
