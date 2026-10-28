import Link from "next/link";
import { AlertCircle, Database, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StudentsDirectory } from "@/components/students/students-directory";
import { requireUser } from "@/lib/auth";
import { isDevSeedEnabled, listStudents } from "@/lib/supabase/teaching-data";
import { createDemoWorkspaceAction } from "@/app/onboarding/actions";
import { seedSampleStudentsAction } from "./actions";

export default async function StudentsPage() {
  await requireUser();
  const { students, error } = await listStudents();

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#FF4F7B]">Students</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Teaching memory by learner</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Real Supabase-backed student records with profile details, teaching memory, lesson history, and personalized AI suggestions.
            </p>
          </div>
          <Link
            href="/students/new"
            className="flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
          >
            <Plus size={17} aria-hidden="true" />
            Add student
          </Link>
        </header>

        {error ? <ErrorState message={error} /> : students.length === 0 ? <EmptyState /> : <StudentsDirectory students={students} />}
      </div>
    </AppShell>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
      <AlertCircle className="mx-auto text-rose-600" size={32} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Could not load students</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Make sure the SQL in <span className="font-semibold">database/schema.sql</span> has been run in Supabase.
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
      <Database className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Create your first student</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Create your first student profile to start storing goals, teaching memory, lesson history, and materials.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/students/new"
          className="rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
        >
          Add student
        </Link>
        <form action={createDemoWorkspaceAction}>
          <button className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]">
            Load Demo Workspace
          </button>
        </form>
        {isDevSeedEnabled() ? (
          <form action={seedSampleStudentsAction}>
            <button className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]">
              Add sample data
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
