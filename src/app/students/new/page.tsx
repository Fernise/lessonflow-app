import { AppShell } from "@/components/app-shell";
import { StudentForm } from "@/components/students/student-form";
import { requireUser } from "@/lib/auth";
import { createStudentAction } from "../actions";

export default async function NewStudentPage() {
  await requireUser();

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">New student</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Create a student profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Store basic info and teaching memory now; lessons, vocabulary, and materials can build on this record.
          </p>
        </header>
        <StudentForm action={createStudentAction} submitLabel="Create student" />
      </div>
    </AppShell>
  );
}
