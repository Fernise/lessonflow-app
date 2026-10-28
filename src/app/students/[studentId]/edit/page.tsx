import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StudentForm } from "@/components/students/student-form";
import { requireUser } from "@/lib/auth";
import { getStudentProfile } from "@/lib/supabase/teaching-data";
import { updateStudentAction } from "../../actions";

type EditStudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function EditStudentPage({ params }: EditStudentPageProps) {
  const { studentId } = await params;
  await requireUser();
  const { student, error } = await getStudentProfile(studentId);

  if (!student && !error) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">Edit student</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">{student?.name || "Student profile"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Update basic details and teaching memory. Changes are saved to Supabase.
          </p>
        </header>
        {error ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm text-rose-700 shadow-sm">{error}</div>
        ) : student ? (
          <StudentForm
            action={updateStudentAction.bind(null, studentId)}
            student={student}
            submitLabel="Save changes"
          />
        ) : null}
      </div>
    </AppShell>
  );
}
