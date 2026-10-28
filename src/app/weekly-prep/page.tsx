import Link from "next/link";
import type { Route } from "next";
import { CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Layers3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createDemoWorkspaceAction } from "@/app/onboarding/actions";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { getStudentReviewNeeds } from "@/lib/student-memory";
import {
  listLessonPlans,
  listMaterials,
  listStudents,
  listWeeklyPreparations
} from "@/lib/supabase/teaching-data";
import type {
  TeachingMaterial,
  WeeklyPreparation,
  WeeklyPreparationSuggestion
} from "@/lib/teaching-types";
import { getMaterialKind, getMaterialReadiness } from "@/lib/lesson-materials";
import { buildWeeklyPreparationSuggestions, getCurrentWeekStart } from "@/lib/weekly-prep";
import { GenerateQuizButton } from "./generate-quiz-button";
import { PrepareWeekForm } from "./prepare-week-form";

type WeeklyPrepPageProps = {
  searchParams?: Promise<{
    week?: string;
  }>;
};

export default async function WeeklyPrepPage({ searchParams }: WeeklyPrepPageProps) {
  const query = await searchParams;
  await requireUser();
  const weekStart = query?.week || getCurrentWeekStart();
  trackEvent("weekly_prep_opened", { weekStart });
  const [
    { students, error: studentsError },
    { lessons, error: lessonsError },
    { materials, error: materialsError },
    { preparations, error: preparationsError }
  ] = await Promise.all([listStudents(), listLessonPlans(), listMaterials(), listWeeklyPreparations()]);
  const error = studentsError || lessonsError || materialsError || preparationsError;
  const smartSuggestions = buildWeeklyPreparationSuggestions({ weekStart, students, lessons, materials });
  const savedPreparation = preparations.find((prep) => prep.weekStart === weekStart);
  const activeSuggestions = mergeFreshAndSavedSuggestions(smartSuggestions, savedPreparation?.suggestions);
  const weekLessons = lessons.filter((lesson) => isInSelectedWeek(lesson.rawDate, weekStart));
  const weekRange = getWeekRange(weekStart);
  const activeWeekLessons = weekLessons.filter((lesson) => lesson.status !== "cancelled");
  const studentsWithLessonsThisWeek = new Set(activeWeekLessons.map((lesson) => lesson.studentId));
  const reviewStudents = students
    .filter((student) => studentsWithLessonsThisWeek.has(student.id))
    .map((student) => ({ student, needs: getStudentReviewNeeds(student, 3) }))
    .filter((item) => item.needs.length > 0);
  const checklistStatuses = activeSuggestions.checklist.map((item) => getPreparationStatus(item));
  const preparedLessons = checklistStatuses.filter((status) => status === "ready").length;
  const lessonsMissingMaterials = activeSuggestions.checklist.filter((item) => getPreparationStatus(item) === "missing").length;
  const reusableMaterialsFound = activeSuggestions.reusableMaterials.length;
  const studentsRequiringReview = reviewStudents.length;
  const progress = activeSuggestions.checklist.length
    ? Math.round((preparedLessons / activeSuggestions.checklist.length) * 100)
    : 0;
  const prevWeek = shiftWeek(weekStart, -1);
  const nextWeek = shiftWeek(weekStart, 1);
  const currentWeek = getCurrentWeekStart();
  const hasLessonsThisWeek = weekLessons.length > 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#FF4F7B]">Weekly Prep</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">What should I prepare this week?</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              A weekly teaching overview that highlights missing materials, reusable assets, review needs, and upcoming lessons.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href={`/weekly-prep?week=${prevWeek}` as Route} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <ChevronLeft size={14} aria-hidden="true" />
                Previous week
              </Link>
              <Link href={`/weekly-prep?week=${currentWeek}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Current week
              </Link>
              <Link href={`/weekly-prep?week=${nextWeek}` as Route} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Next week
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
              <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
                {formatDate(weekRange.start)} - {formatDate(weekRange.end)}
              </span>
            </div>
          </div>
          <PrepareWeekForm weekStart={weekStart} />
        </header>

        {error ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 text-sm text-rose-700 shadow-sm">{error}</section>
        ) : null}

        <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">This week</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#1F2937]">Weekly teaching overview</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {activeWeekLessons.length} lessons, {preparedLessons} prepared, {lessonsMissingMaterials} missing materials,
                {" "}{reusableMaterialsFound} reusable materials available.
              </p>
            </div>
            <div className="min-w-44 rounded-2xl bg-[#FFF5F8] p-4">
              <p className="text-xs font-semibold text-[#FF4F7B]">Preparation progress</p>
              <p className="mt-1 text-3xl font-semibold text-[#1F2937]">{progress}%</p>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-[#FF4F7B]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <OverviewCard label="Lessons this week" value={activeWeekLessons.length} />
            <OverviewCard label="Prepared lessons" value={preparedLessons} tone="success" />
            <OverviewCard label="Missing materials" value={lessonsMissingMaterials} tone={lessonsMissingMaterials ? "danger" : "success"} />
            <OverviewCard label="Reusable materials" value={reusableMaterialsFound} />
            <OverviewCard label="Students requiring review" value={studentsRequiringReview} />
          </div>
        </section>

        {students.length === 0 ? (
          <EmptyState />
        ) : !hasLessonsThisWeek ? (
          <NoLessonsState />
        ) : (
          <>
            <PreparationStatus preparation={savedPreparation} weekStart={weekStart} />
            <StudentsNeedingReviewPanel items={reviewStudents} />
            <PreparationChecklist suggestions={activeSuggestions} materials={materials} weekStart={weekStart} />
            <SuggestionSections suggestions={activeSuggestions} />
            <PreviousSessions preparations={preparations} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function OverviewCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-rose-700" : "text-[#1F2937]";
  return (
    <article className="rounded-2xl border border-rose-100 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </article>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
      <CalendarCheck className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Prepare your first teaching week</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        Weekly Prep uses real students, planned lessons, saved materials, and teaching memory.
      </p>
      <Link
        href="/students/new"
        className="mt-5 inline-flex rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
      >
        Add student
      </Link>
      <form action={createDemoWorkspaceAction} className="mt-3">
        <button className="inline-flex rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]">
          Load Demo Workspace
        </button>
      </form>
    </section>
  );
}

function NoLessonsState() {
  return (
    <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
      <CalendarCheck className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">No lessons planned this week</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        Plan at least one lesson to unlock weekly preparation suggestions and checklist tracking.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link href="/lesson-planner" className="inline-flex rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
          Plan a lesson
        </Link>
        <Link href="/ai-generator" className="inline-flex rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]">
          Generate material
        </Link>
        <form action={createDemoWorkspaceAction}>
          <button className="inline-flex rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]">
            Load Demo Workspace
          </button>
        </form>
      </div>
    </section>
  );
}

function PreparationStatus({ preparation, weekStart }: { preparation?: WeeklyPreparation; weekStart: string }) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Weekly analysis</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">
            Week of {formatDate(weekStart)}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {preparation?.summary || "Click Prepare my week to analyze weekly prep gaps and reusable assets."}
          </p>
        </div>
        {preparation ? (
          <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
            Analysis saved · {preparation.status}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function StudentsNeedingReviewPanel({
  items
}: {
  items: Array<{ student: { id: string; name: string; level: string }; needs: string[] }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Students needing review</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Memory items to recycle this week</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use these as correction focus, vocabulary recycling, or warm follow-up prompts.
          </p>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">{items.length} students</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map(({ student, needs }) => (
          <article key={student.id} className="rounded-2xl bg-[#FFF5F8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#1F2937]">{student.name}</p>
              <span className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{student.level}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {needs.map((need) => (
                <span key={need} className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {need}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SuggestionSections({ suggestions }: { suggestions: WeeklyPreparationSuggestion }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <Panel title="Priority lessons to prepare" icon={<ClipboardList size={20} />}>
        {suggestions.priorityLessons.length ? (
          suggestions.priorityLessons.map((item) => (
            <ActionRow key={`${item.studentId}-${item.lessonDate}-${item.topic}`}>
              <div>
                <p className="font-semibold text-[#1F2937]">{item.studentName}</p>
                <p className="text-sm text-slate-600">{item.topic} · {item.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/ai-generator?student=${item.studentId}&type=Speaking+questions&topic=${encodeURIComponent(item.topic || "")}` as Route} className="rounded-xl bg-[#FF4F7B] px-3 py-2 text-xs font-semibold text-white">
                  Generate speaking questions
                </Link>
                <Link href={`/ai-generator?student=${item.studentId}&type=Vocabulary+sheet&topic=${encodeURIComponent(item.topic || "")}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Generate vocabulary
                </Link>
                <Link href={`/materials?topic=${encodeURIComponent(item.topic || "")}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Find reusable material
                </Link>
                <Link href={`/lesson-planner?student=${item.studentId}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  View in planner
                </Link>
              </div>
            </ActionRow>
          ))
        ) : (
          <EmptyLine text="No urgent lessons detected." />
        )}
      </Panel>

      <Panel title="Reusable materials" icon={<Layers3 size={20} />}>
        {suggestions.reusableMaterials.length ? (
          suggestions.reusableMaterials.map((item) => (
            <ActionRow key={item.materialId}>
              <div>
                <p className="font-semibold text-[#1F2937]">{item.title}</p>
                <p className="text-sm text-slate-600">{item.topic} · {item.studentNames.join(", ") || "Reusable this week"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/materials?material=${item.materialId}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
                  Open library
                </Link>
                <Link href="/lesson-planner" className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Use in planner
                </Link>
              </div>
            </ActionRow>
          ))
        ) : (
          <EmptyLine text="No reusable materials found for this week." />
        )}
      </Panel>

      <Panel title="Shared topics across students">
        {suggestions.sharedTopics.length ? (
          suggestions.sharedTopics.map((item) => (
            <TagLine key={item.topic} label={item.topic} value={item.studentNames.join(", ")} />
          ))
        ) : (
          <EmptyLine text="No shared topics detected yet." />
        )}
      </Panel>

      <Panel title="Vocabulary review list">
        <TagCloud items={suggestions.vocabularyReviewList} empty="No vocabulary review items yet." />
      </Panel>

      <Panel title="Follow-up ideas">
        {suggestions.suggestedHomework.length ? (
          suggestions.suggestedHomework.map((item) => (
            <TagLine key={item.studentName} label={item.studentName} value={item.homework} />
          ))
        ) : (
          <EmptyLine text="No homework suggestions yet." />
        )}
      </Panel>

      <Panel title="Risks / reminders">
        {suggestions.risksReminders.length ? (
          suggestions.risksReminders.map((item) => <EmptyLine key={item} text={item} />)
        ) : (
          <EmptyLine text="No major risks detected." />
        )}
      </Panel>
    </section>
  );
}

function PreparationChecklist({
  suggestions,
  materials,
  weekStart
}: {
  suggestions: WeeklyPreparationSuggestion;
  materials: TeachingMaterial[];
  weekStart: string;
}) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Upcoming lessons</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Preparation checklist</h2>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
          {suggestions.checklist.length} lessons analyzed
        </span>
      </div>
      {suggestions.checklist.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-5 text-sm text-slate-600">No lessons planned for this week yet.</div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {suggestions.checklist.map((item) => {
            const attachedMaterials = getChecklistAttachedMaterials(item, materials);
            const readiness = getMaterialReadiness(attachedMaterials);
            return (
            <article key={`${item.studentId}-${item.lessonDate}`} className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#1F2937]">{item.studentName}</p>
                    {item.lessonStatus === "completed" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Completed
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(item.lessonDate)} · {item.level} · {item.topic || "Topic missing"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={getPreparationStatus(item)} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{getPreparationMessage(item)}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <CheckPill label="Linked material" ready={item.materialReady} />
                <CheckPill label="Speaking" ready={readiness.Speaking} />
                <CheckPill label="Vocabulary" ready={readiness.Vocabulary} />
                <CheckPill label="Listening" ready={readiness.Listening} />
                <CheckPill label="Quiz" ready={readiness.Quiz} />
                <CheckPill label="Roleplay" ready={readiness.Roleplay} />
              </div>
              <AttachedMaterialsList materials={attachedMaterials} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/ai-generator?student=${item.studentId}&lesson=${item.lessonId || ""}&type=Speaking+questions&topic=${encodeURIComponent(item.topic || "")}&level=${item.level}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
                  Generate speaking questions
                </Link>
                <Link href={`/ai-generator?student=${item.studentId}&lesson=${item.lessonId || ""}&type=Vocabulary+sheet&topic=${encodeURIComponent(item.topic || "")}&level=${item.level}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Generate vocabulary
                </Link>
                <Link href={`/ai-generator?student=${item.studentId}&lesson=${item.lessonId || ""}&type=Listening+activity&topic=${encodeURIComponent(item.topic || "")}&level=${item.level}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Generate listening
                </Link>
                <Link href={`/ai-generator?student=${item.studentId}&lesson=${item.lessonId || ""}&type=Roleplay&topic=${encodeURIComponent(item.topic || "")}&level=${item.level}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Generate roleplay
                </Link>
                {item.lessonId ? (
                  <GenerateQuizButton
                    lessonId={item.lessonId}
                    weekStart={weekStart}
                    hasRelatedMaterial={hasRelatedMaterialForChecklistItem(item, materials)}
                  />
                ) : null}
                <Link href={`/lesson-planner?lesson=${item.lessonId || ""}&student=${item.studentId}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Open lesson
                </Link>
                <Link href={`/materials?student=${item.studentId}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  Browse reusable
                </Link>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AttachedMaterialsList({ materials }: { materials: TeachingMaterial[] }) {
  if (materials.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2">
      {materials.map((material) => (
        <div key={material.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
          <div>
            <p className="text-sm font-semibold text-[#1F2937]">{material.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {getMaterialKind(material)} · {material.level} · {material.topic || "No topic"}
            </p>
          </div>
          <Link href={`/materials?material=${material.id}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
            View material
          </Link>
        </div>
      ))}
    </div>
  );
}

function PreviousSessions({ preparations }: { preparations: WeeklyPreparation[] }) {
  if (preparations.length === 0) return null;
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#1F2937]">Recent preparation sessions</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {preparations.map((prep) => (
          <article key={prep.id} className="rounded-2xl bg-[#FFF5F8] p-4">
            <p className="font-semibold text-[#1F2937]">{formatDate(prep.weekStart)}</p>
            <p className="mt-1 text-sm text-slate-600">{prep.summary}</p>
            <span className="mt-3 inline-flex rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-600">{prep.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1F2937]">
        {icon ? <span className="text-[#FF4F7B]">{icon}</span> : null}
        {title}
      </h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FFF5F8] p-4">{children}</div>;
}

function TagLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF5F8] p-4">
      <p className="font-semibold text-[#1F2937]">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}

function TagCloud({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <EmptyLine text={empty} />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-xl bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-[#FF4F7B]">
          {item}
        </span>
      ))}
    </div>
  );
}

function CheckPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className={`rounded-xl px-3 py-2 text-xs font-semibold ${ready ? "bg-white text-emerald-700" : "bg-white text-rose-700"}`}>
      {ready ? "Ready" : "Missing"} · {label}
    </span>
  );
}

function StatusPill({ status }: { status: "missing" | "partially prepared" | "ready" }) {
  const style =
    status === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "partially prepared"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-700";
  return <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${style}`}>{status}</span>;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-2xl bg-[#FFF5F8] p-4 text-sm text-slate-600">{text}</p>;
}

function isInSelectedWeek(date: string, weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const value = new Date(`${date}T00:00:00`);
  return value >= start && value < end;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function shiftWeek(weekStart: string, delta: number) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + delta * 7);
  return date.toISOString().slice(0, 10);
}

function getWeekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: weekStart,
    end: end.toISOString().slice(0, 10)
  };
}

function getPreparationStatus(item: WeeklyPreparationSuggestion["checklist"][number]) {
  if (item.lessonStatus === "completed") return "ready" as const;
  if (item.materialReady) return "ready" as const;
  if (item.reusableMaterialIds.length > 0 || item.speakingMaterialReady || item.vocabularyMaterialReady) return "partially prepared" as const;
  return "missing" as const;
}

function getPreparationMessage(item: WeeklyPreparationSuggestion["checklist"][number]) {
  const status = getPreparationStatus(item);
  if (item.lessonStatus === "completed") return "Completed lesson. Keep it in history, but no prep is needed.";
  if (status === "ready") return "Ready: this lesson already has linked material.";
  if (status === "partially prepared") return "Partially prepared: useful material exists, but it is not fully linked or complete.";
  return "Missing materials: generate or reuse material before the lesson.";
}

function hasRelatedMaterialForChecklistItem(
  item: WeeklyPreparationSuggestion["checklist"][number],
  materials: TeachingMaterial[]
) {
  const topic = item.topic.trim().toLowerCase();
  return materials.some((material) => {
    if (material.studentId !== item.studentId) return false;
    if (item.reusableMaterialIds.includes(material.id)) return true;
    if (!topic) return true;
    return material.topic.trim().toLowerCase() === topic;
  });
}

function getChecklistAttachedMaterials(
  item: WeeklyPreparationSuggestion["checklist"][number],
  materials: TeachingMaterial[]
) {
  const ids = new Set(item.attachedMaterialIds || []);
  return materials.filter((material) => ids.has(material.id));
}

function mergeFreshAndSavedSuggestions(
  fresh: WeeklyPreparationSuggestion,
  saved?: WeeklyPreparationSuggestion
): WeeklyPreparationSuggestion {
  if (!saved) return fresh;
  const savedChecklistByLesson = new Map(
    saved.checklist
      .filter((item) => item.lessonId)
      .map((item) => [item.lessonId, item])
  );

  const checklist = fresh.checklist.map((item) => {
    const savedItem = item.lessonId ? savedChecklistByLesson.get(item.lessonId) : undefined;
    if (!savedItem) return item;
    const wasManuallyPrepared =
      savedItem.lessonPlanReady &&
      savedItem.materialReady &&
      savedItem.speakingMaterialReady &&
      savedItem.vocabularyMaterialReady &&
      savedItem.notesReady;
    return wasManuallyPrepared
      ? {
          ...item,
          lessonPlanReady: true,
          materialReady: true,
          speakingMaterialReady: true,
          vocabularyMaterialReady: true,
          homeworkReady: true,
          notesReady: true
        }
      : item;
  });

  return {
    ...fresh,
    checklist
  };
}
