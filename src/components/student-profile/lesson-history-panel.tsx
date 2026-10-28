"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import type { LessonRecord, LessonStatus } from "@/lib/teaching-types";

type LessonHistoryPanelProps = {
  lessons: LessonRecord[];
};

type LessonFilter = "all" | LessonStatus;

const pageSize = 4;
const filters: Array<{ label: string; value: LessonFilter }> = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" }
];

export function LessonHistoryPanel({ lessons }: LessonHistoryPanelProps) {
  const safeLessons = useMemo(() => (Array.isArray(lessons) ? lessons : []), [lessons]);
  const [filter, setFilter] = useState<LessonFilter>("all");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const filteredLessons = useMemo(() => {
    return safeLessons
      .filter((lesson) => filter === "all" || (lesson.status || "completed") === filter)
      .sort((a, b) => getSortDate(b).localeCompare(getSortDate(a)));
  }, [filter, safeLessons]);

  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLessons = filteredLessons.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateFilter(nextFilter: LessonFilter) {
    setFilter(nextFilter);
    setPage(1);
    setExpandedIds([]);
  }

  function toggleExpanded(lessonId: string) {
    setExpandedIds((current) =>
      current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId]
    );
  }

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">Lesson History</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Recent lessons and feedback</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Compact history for quick review. Expand a lesson only when you need the details.
          </p>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
          {filteredLessons.length} lessons
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => {
            const selected = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => updateFilter(item.value)}
                aria-pressed={selected}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selected
                    ? "border-[#FF4F7B] bg-[#FFF5F8] text-[#E63E69]"
                    : "border-rose-100 bg-white text-slate-600 hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-slate-500">Newest first</p>
      </div>

      {visibleLessons.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-[#FFF5F8] p-5 text-sm text-slate-600">
          No lessons match this filter yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {visibleLessons.map((lesson) => {
            const lessonId = lesson.id || `${lesson.rawDate || lesson.date}-${lesson.title}`;
            const expanded = expandedIds.includes(lessonId);
            const status = lesson.status || "completed";
            const preview = getNotesPreview(lesson);
            return (
              <article key={lessonId} className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
                <button
                  type="button"
                  onClick={() => toggleExpanded(lessonId)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                  aria-expanded={expanded}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">{lesson.date}</p>
                      <StatusBadge status={status} />
                      {lesson.materialTitle ? (
                        <span className="rounded-xl bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                          Material: {lesson.materialTitle}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 truncate font-semibold text-[#1F2937]">
                      {lesson.topic || lesson.title || lesson.lessonGoal || "Untitled lesson"}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {preview || "No lesson notes saved yet."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[#FF4F7B]">
                    <ClipboardCheck size={18} aria-hidden="true" />
                    <ChevronDown size={16} className={`transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${expanded ? "mt-4 max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DetailBlock label="Topics covered" value={lesson.topicsCovered.join(", ") || lesson.topic || "Not recorded"} />
                    <DetailBlock label="Focus" value={lesson.skillFocus || lesson.focus || "Not recorded"} />
                    <DetailBlock label="Homework assigned" value={lesson.homeworkAssigned || "No homework recorded"} />
                    <DetailBlock label="Lesson notes" value={lesson.notes || "No notes recorded"} />
                    <DetailBlock label="Teacher feedback" value={lesson.teacherFeedback || "No feedback recorded"} />
                    <DetailBlock label="Student performance" value={lesson.studentPerformance || "No performance notes recorded"} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filteredLessons.length > pageSize ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">
            Page {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  const style =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "cancelled"
        ? "bg-slate-200 text-slate-600"
        : "bg-white text-[#FF4F7B]";
  return <span className={`rounded-xl px-2 py-1 text-[11px] font-semibold capitalize ${style}`}>{status}</span>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function getSortDate(lesson: LessonRecord) {
  return lesson.rawDate || lesson.date || "";
}

function getNotesPreview(lesson: LessonRecord) {
  return lesson.notes || lesson.teacherFeedback || lesson.studentPerformance || lesson.lessonGoal || lesson.focus || "";
}
