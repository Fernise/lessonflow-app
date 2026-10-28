import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AiSuggestionsPanel } from "@/components/student-profile/ai-suggestions-panel";
import { BasicInfoCard } from "@/components/student-profile/basic-info-card";
import { GeneratedMaterialsPanel } from "@/components/student-profile/generated-materials-panel";
import { LessonHistoryPanel } from "@/components/student-profile/lesson-history-panel";
import { MemorySummaryCard } from "@/components/student-profile/memory-summary-card";
import { QuickActionsPanel } from "@/components/student-profile/quick-actions-panel";
import { StudentSnapshotCard } from "@/components/student-profile/student-snapshot-card";
import { TeachingMemoryCard } from "@/components/student-profile/teaching-memory-card";
import { DeleteStudentButton } from "@/components/students/delete-student-button";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { getStudentProfile } from "@/lib/supabase/teaching-data";

type StudentProfilePageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { studentId } = await params;
  await requireUser();
  const { student, materials, error } = await getStudentProfile(studentId);

  if (!student && !error) notFound();
  if (student) trackEvent("student_viewed", { studentId: student.id, level: student.level });

  return (
    <AppShell>
      <div className="space-y-6">
        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-6 text-sm text-rose-700 shadow-sm">
            {error}
          </section>
        ) : null}
        {student ? (
          <>
            <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#FF4F7B]">Student profile</p>
                  <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">{student.name}</h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {student.level} · {student.nativeLanguage || "Language not set"} speaker ·{" "}
                    {student.lessonFrequency || "Frequency not set"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF5F8] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next focus</p>
                  <p className="mt-1 max-w-md text-sm font-semibold text-[#1F2937]">{student.nextSuggestedFocus}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr,320px]">
              <div className="space-y-6">
                <StudentSnapshotCard student={student} materials={materials} />
                <BasicInfoCard student={student} />
                <MemorySummaryCard student={student} />
                <TeachingMemoryCard student={student} />
                <AiSuggestionsPanel suggestions={student.aiSuggestions} />
                <LessonHistoryPanel lessons={student.lessonHistory} />
                <GeneratedMaterialsPanel materials={materials} student={student} />
              </div>
              <aside className="space-y-6">
                <QuickActionsPanel student={student} />
                <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-[#FF4F7B]">Profile management</p>
                  <div className="mt-4 grid gap-2">
                    <Link
                      href={`/students/${student.id}/edit` as Route}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
                    >
                      Edit student
                    </Link>
                    <DeleteStudentButton studentId={student.id} />
                  </div>
                </section>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
