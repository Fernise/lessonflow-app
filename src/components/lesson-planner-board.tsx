"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { CalendarPlus, CheckCircle2, Eye, Link2, Pencil, Search, Star, Trash2, X } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createLessonPlanAction,
  updateLessonPlanAction
} from "@/app/lesson-planner/actions";
import { AppSelect } from "@/components/ui/app-select";
import { defaultLessonStructure } from "@/lib/lesson-structure";
import { getAttachedMaterialIds, getAttachedMaterials, getMaterialKind, getMaterialReadiness } from "@/lib/lesson-materials";
import { showToast } from "@/components/toast-provider";
import type { LessonStructure, TeachingMaterial, TeachingStudent } from "@/lib/teaching-types";

type LessonPlan = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  studentId: string;
  studentName: string;
  studentLevel: string;
  materialId: string | null;
  materialTitle: string;
  rawDate: string;
  date: string;
  durationMinutes: number;
  status: "planned" | "completed" | "cancelled";
  title: string;
  focus: string;
  topic: string;
  skillFocus: string;
  lessonGoal: string;
  lessonStructure: LessonStructure;
  teacherNotes: string;
  homeworkAssigned: string;
  studentPerformance: string;
};

type LessonPlannerBoardProps = {
  students: TeachingStudent[];
  materials: TeachingMaterial[];
  lessons: LessonPlan[];
};

type LessonReadinessStatus = "Ready" | "Partially Ready" | "Missing Materials";

const skillFocusOptions = ["Speaking", "Listening", "Reading", "Vocabulary", "Grammar", "Fluency"];
const durationOptions = [30, 45, 60, 90];
const lessonPageSize = 10;
const weeklyViewPageSize = 4;
const materialTypeFilters = ["All", "Speaking", "Vocabulary", "Listening", "Quiz", "Roleplay"] as const;

export function LessonPlannerBoard({ students, materials, lessons }: LessonPlannerBoardProps) {
  const searchParams = useSearchParams();
  const [recentlyCreatedLessons, setRecentlyCreatedLessons] = useState<LessonPlan[]>([]);
  const [pendingDeleteLessons, setPendingDeleteLessons] = useState<LessonPlan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonPlan | null>(null);
  const [formRevealNonce, setFormRevealNonce] = useState(0);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const [completingLesson, setCompletingLesson] = useState<LessonPlan | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [statusActionState, setStatusActionState] = useState<{ lessonId: string; mode: "completing" | "undoing" } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, LessonPlan["status"]>>({});
  const [attachmentOverrides, setAttachmentOverrides] = useState<Record<string, string[]>>({});
  const [expandedCompletedNotes, setExpandedCompletedNotes] = useState<string[]>([]);
  const [lessonSearch, setLessonSearch] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState(searchParams.get("lesson") || "");
  const [studentFilter, setStudentFilter] = useState(searchParams.get("student") || "All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [materialTypeFilter, setMaterialTypeFilter] = useState<(typeof materialTypeFilters)[number]>("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("upcoming");
  const [lessonPage, setLessonPage] = useState(1);
  const [weeklyPage, setWeeklyPage] = useState(1);
  const pendingDeleteTimersRef = useState(() => new Map<string, number>())[0];
  const deletedLessonsRef = useState(
    () => new Map<string, { lesson: LessonPlan; deletedInDb: boolean; undoRequested: boolean }>()
  )[0];
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedLessonRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const mergedLessons = useMemo(() => {
    const byId = new Map<string, LessonPlan>();
    lessons.forEach((lesson) => byId.set(lesson.id, lesson));
    recentlyCreatedLessons.forEach((lesson) => {
      if (!byId.has(lesson.id)) byId.set(lesson.id, lesson);
    });
    pendingDeleteLessons.forEach((lesson) => byId.delete(lesson.id));
    return Array.from(byId.values()).sort((a, b) => {
      const dateCmp = b.rawDate.localeCompare(a.rawDate);
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [lessons, pendingDeleteLessons, recentlyCreatedLessons]);
  const displayLessons = useMemo(
    () =>
      mergedLessons.map((lesson) =>
        applyAttachmentOverride({ ...lesson, status: statusOverrides[lesson.id] || lesson.status }, attachmentOverrides[lesson.id])
      ),
    [attachmentOverrides, mergedLessons, statusOverrides]
  );
  const searchableLessons = useMemo(() => {
    const value = lessonSearch.trim().toLowerCase();
    const filtered = displayLessons.filter((lesson) => {
      const attachedMaterials = getAttachedMaterials(lesson, materials);
      const readiness = getMaterialReadiness(attachedMaterials);
      const readinessStatus = getLessonReadinessStatus(lesson, attachedMaterials);
      const matchesSearch =
        !value ||
        [lesson.studentName, lesson.topic, lesson.lessonGoal, lesson.status, lesson.skillFocus, ...attachedMaterials.map((material) => material.title)]
          .join(" ")
          .toLowerCase()
          .includes(value);
      const matchesStudent = studentFilter === "All" || lesson.studentId === studentFilter;
      const matchesStatus = statusFilter === "All" || lesson.status === statusFilter;
      const matchesReadiness =
        readinessFilter === "All" ||
        readinessFilter === readinessStatus;
      const matchesMaterialType =
        materialTypeFilter === "All" || attachedMaterials.some((material) => getMaterialKind(material) === materialTypeFilter);
      const matchesDateRange = matchesLessonDateRange(lesson.rawDate, dateRangeFilter);
      return matchesSearch && matchesStudent && matchesStatus && matchesReadiness && matchesMaterialType && matchesDateRange;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "student") return a.studentName.localeCompare(b.studentName);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "updated") return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
      if (sortBy === "recent") return b.rawDate.localeCompare(a.rawDate);
      return a.rawDate.localeCompare(b.rawDate);
    });
  }, [dateRangeFilter, displayLessons, lessonSearch, materialTypeFilter, materials, readinessFilter, sortBy, statusFilter, studentFilter]);
  const totalLessonPages = Math.max(1, Math.ceil(searchableLessons.length / lessonPageSize));
  const currentLessonPage = Math.min(lessonPage, totalLessonPages);
  const actionableLessons = searchableLessons.slice((currentLessonPage - 1) * lessonPageSize, currentLessonPage * lessonPageSize);
  const totalWeeklyPages = Math.max(1, Math.ceil(searchableLessons.length / weeklyViewPageSize));
  const currentWeeklyPage = Math.min(weeklyPage, totalWeeklyPages);
  const weekLessons = searchableLessons.slice((currentWeeklyPage - 1) * weeklyViewPageSize, currentWeeklyPage * weeklyViewPageSize);
  const selectedLesson = displayLessons.find((lesson) => lesson.id === selectedLessonId) || null;

  useEffect(() => {
    setLessonPage(1);
    setWeeklyPage(1);
  }, [dateRangeFilter, lessonSearch, materialTypeFilter, readinessFilter, sortBy, statusFilter, studentFilter]);

  useEffect(() => {
    const lessonId = searchParams.get("lesson");
    if (lessonId) setSelectedLessonId(lessonId);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedLessonId) return;
    const frameId = window.requestAnimationFrame(() => {
      selectedLessonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedLessonId]);

  useEffect(() => {
    setRecentlyCreatedLessons((current) => current.filter((item) => !lessons.some((lesson) => lesson.id === item.id)));
  }, [lessons]);

  useEffect(() => {
    setStatusOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const lessonId of Object.keys(next)) {
        if (!displayLessons.some((lesson) => lesson.id === lessonId)) {
          delete next[lessonId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [displayLessons]);

  useEffect(() => {
    setAttachmentOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const lessonId of Object.keys(next)) {
        if (!mergedLessons.some((lesson) => lesson.id === lessonId)) {
          delete next[lessonId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [mergedLessons]);

  useEffect(() => {
    return () => {
      pendingDeleteTimersRef.forEach((timerId) => window.clearTimeout(timerId));
      pendingDeleteTimersRef.clear();
      deletedLessonsRef.clear();
    };
  }, [deletedLessonsRef, pendingDeleteTimersRef]);

  useEffect(() => {
    if (!isCreating && !editingLesson) return;
    const frameId = window.requestAnimationFrame(() => {
      formContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsFormHighlighted(true);
      window.setTimeout(() => {
        const focusable = formContainerRef.current?.querySelector<HTMLElement>(
          'button[role="combobox"], input:not([type="hidden"]), textarea'
        );
        focusable?.focus({ preventScroll: true });
      }, 450);
    });
    const highlightTimer = window.setTimeout(() => setIsFormHighlighted(false), 1400);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(highlightTimer);
    };
  }, [editingLesson, formRevealNonce, isCreating]);

  function openCreateForm() {
    setEditingLesson(null);
    setIsCreating(true);
    setFormRevealNonce((current) => current + 1);
  }

  function openEditForm(lesson: LessonPlan) {
    setIsCreating(false);
    setEditingLesson(lesson);
    setFormRevealNonce((current) => current + 1);
  }

  function clearLessonRelatedUiState(lessonId: string) {
    setCompletingLesson((current) => (current?.id === lessonId ? null : current));
    setEditingLesson((current) => (current?.id === lessonId ? null : current));
    setIsCreating((current) => (editingLesson?.id === lessonId ? false : current));
  }

  function queueDeleteLessonWithUndo(lesson: LessonPlan) {
    clearLessonRelatedUiState(lesson.id);
    setPendingDeleteLessons((current) => [lesson, ...current.filter((item) => item.id !== lesson.id)]);
    deletedLessonsRef.set(lesson.id, { lesson, deletedInDb: false, undoRequested: false });
    showToast({
      type: "info",
      title: "Lesson deleted",
      description: "Undo available for 5 seconds.",
      durationMs: 5000,
      actionLabel: "Undo",
      onAction: async () => {
        const currentTracking = deletedLessonsRef.get(lesson.id);
        if (currentTracking) deletedLessonsRef.set(lesson.id, { ...currentTracking, undoRequested: true });
        const timerId = pendingDeleteTimersRef.get(lesson.id);
        if (timerId) window.clearTimeout(timerId);
        pendingDeleteTimersRef.delete(lesson.id);
        const tracking = deletedLessonsRef.get(lesson.id);
        if (tracking?.deletedInDb) {
          try {
            if (process.env.NODE_ENV === "development") {
              console.info("[lessons.undo] deleted lesson payload", tracking.lesson);
            }
            const response = await fetch("/api/lessons/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lesson: {
                  studentId: tracking.lesson.studentId,
                  materialId: tracking.lesson.materialId,
                  rawDate: tracking.lesson.rawDate,
                  durationMinutes: tracking.lesson.durationMinutes,
                  status: tracking.lesson.status,
                  title: tracking.lesson.title,
                  topic: tracking.lesson.topic,
                  skillFocus: tracking.lesson.skillFocus,
                  lessonGoal: tracking.lesson.lessonGoal,
                  lessonStructure: tracking.lesson.lessonStructure,
                  teacherNotes: tracking.lesson.teacherNotes,
                  homeworkAssigned: tracking.lesson.homeworkAssigned,
                  studentPerformance: tracking.lesson.studentPerformance
                }
              })
            });
            const payload = (await response.json()) as { ok?: boolean; error?: string; lesson?: LessonPlan };
            if (process.env.NODE_ENV === "development") {
              console.info("[lessons.undo] restore response", payload);
            }
            if (!response.ok || !payload.ok || !payload.lesson) throw new Error(payload.error || "Could not restore lesson.");
            const restoredLesson = payload.lesson;
            setRecentlyCreatedLessons((current) => [restoredLesson, ...current.filter((item) => item.id !== restoredLesson.id)]);
            setPendingDeleteLessons((current) => current.filter((item) => item.id !== lesson.id));
            deletedLessonsRef.delete(lesson.id);
            const inCurrentView = restoredLesson.status !== "cancelled";
            const visibleAfterRestore = [restoredLesson, ...mergedLessons]
              .filter((item) => item.status !== "cancelled")
              .slice(0, 12)
              .some((item) => item.id === restoredLesson.id);
            if (process.env.NODE_ENV === "development") {
              console.info("[lessons.undo] current view filters", {
                inCurrentView,
                visibleAfterRestore,
                status: restoredLesson.status
              });
            }
            showToast({
              type: "success",
              title:
                inCurrentView && visibleAfterRestore
                  ? "Lesson restored"
                  : "Lesson restored, but it is outside the current week/filter."
            });
            router.refresh();
          } catch (error) {
            showToast({
              type: "error",
              title: "Restore failed",
              description: error instanceof Error ? error.message : "Could not restore lesson."
            });
          }
        } else {
          setPendingDeleteLessons((current) => current.filter((item) => item.id !== lesson.id));
          deletedLessonsRef.delete(lesson.id);
          showToast({ type: "success", title: "Lesson restored" });
        }
      }
    });

    const existingTimer = pendingDeleteTimersRef.get(lesson.id);
    if (existingTimer) window.clearTimeout(existingTimer);
    const timerId = window.setTimeout(async () => {
      const trackingBeforeDelete = deletedLessonsRef.get(lesson.id);
      if (!trackingBeforeDelete || trackingBeforeDelete.undoRequested) {
        pendingDeleteTimersRef.delete(lesson.id);
        return;
      }
      try {
        const response = await fetch("/api/lessons/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: lesson.id })
        });
        const payload = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not delete lesson.");
        const tracking = deletedLessonsRef.get(lesson.id);
        if (tracking?.undoRequested) {
          pendingDeleteTimersRef.delete(lesson.id);
          return;
        }
        if (tracking) deletedLessonsRef.set(lesson.id, { ...tracking, deletedInDb: true });
        setPendingDeleteLessons((current) => current.filter((item) => item.id !== lesson.id));
        router.refresh();
      } catch (error) {
        setPendingDeleteLessons((current) => current.filter((item) => item.id !== lesson.id));
        showToast({
          type: "error",
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Could not delete lesson."
        });
      } finally {
        pendingDeleteTimersRef.delete(lesson.id);
      }
    }, 5000);
    pendingDeleteTimersRef.set(lesson.id, timerId);
  }

  async function toggleLessonCompleted(lesson: LessonPlan) {
    const nextStatus = lesson.status === "completed" ? "planned" : "completed";
    const mode = nextStatus === "completed" ? "completing" : "undoing";
    setStatusActionState({ lessonId: lesson.id, mode });
    try {
      const response = await fetch("/api/lessons/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, status: nextStatus })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not update lesson status.");
      setStatusOverrides((current) => ({ ...current, [lesson.id]: nextStatus }));
      if (nextStatus === "completed") {
        setCompletingLesson({ ...lesson, status: "completed" });
        showToast({ type: "success", title: "Lesson completed" });
      } else {
        setCompletingLesson((current) => (current?.id === lesson.id ? null : current));
        showToast({ type: "success", title: "Lesson marked as planned" });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Could not update lesson status."
      });
    } finally {
      setStatusActionState((current) => (current?.lessonId === lesson.id ? null : current));
    }
  }

  async function attachMaterial(lessonId: string, materialId: string) {
    if (!materialId) return false;
    try {
      const response = await fetch("/api/lessons/attach-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, materialId })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not attach material.");
      setAttachmentOverrides((current) => {
        const lesson = displayLessons.find((item) => item.id === lessonId);
        const existingIds = current[lessonId] || (lesson ? getAttachedMaterialIds(lesson) : []);
        return {
          ...current,
          [lessonId]: Array.from(new Set([...existingIds, materialId]))
        };
      });
      showToast({ type: "success", title: "Material attached" });
      return true;
    } catch (error) {
      showToast({ type: "error", title: "Attach failed", description: error instanceof Error ? error.message : "Try again." });
      return false;
    }
  }

  async function detachMaterial(lessonId: string, materialId: string) {
    try {
      const response = await fetch("/api/lessons/detach-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, materialId })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not detach material.");
      setAttachmentOverrides((current) => {
        const lesson = displayLessons.find((item) => item.id === lessonId);
        const existingIds = current[lessonId] || (lesson ? getAttachedMaterialIds(lesson) : []);
        return {
          ...current,
          [lessonId]: existingIds.filter((id) => id !== materialId)
        };
      });
      showToast({ type: "success", title: "Material detached" });
      return true;
    } catch (error) {
      showToast({ type: "error", title: "Detach failed", description: error instanceof Error ? error.message : "Try again." });
      return false;
    }
  }

  if (students.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center shadow-sm">
        <CalendarPlus className="mx-auto text-[#FF4F7B]" size={34} aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Plan your first lesson</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Add a student first, then plan your first lesson with memory-based suggestions.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">Weekly view</h2>
            <p className="mt-1 text-sm text-slate-600">
              A compact rotating view of lessons. Showing {weekLessons.length} of {searchableLessons.length}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeeklyPage((current) => Math.max(1, current - 1))}
              disabled={currentWeeklyPage === 1}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
              {currentWeeklyPage} / {totalWeeklyPages}
            </span>
            <button
              type="button"
              onClick={() => setWeeklyPage((current) => Math.min(totalWeeklyPages, current + 1))}
              disabled={currentWeeklyPage === totalWeeklyPages}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <button
              data-testid="create-lesson"
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
            >
              <CalendarPlus size={16} aria-hidden="true" />
              Create new lesson plan
            </button>
          </div>
        </div>
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
          <input
            value={lessonSearch}
            onChange={(event) => setLessonSearch(event.target.value)}
            placeholder="Search lessons by student, topic, or status..."
            className="w-full rounded-2xl border border-rose-100 bg-white py-2.5 pl-10 pr-10 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
          />
          {lessonSearch ? (
            <button
              type="button"
              onClick={() => setLessonSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-[#FF4F7B]"
              aria-label="Clear lesson search"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <CompactSelect
            label="Student"
            value={studentFilter}
            onChange={setStudentFilter}
            options={[{ value: "All", label: "All students" }, ...students.map((student) => ({ value: student.id, label: student.name }))]}
          />
          <CompactSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={["All", "planned", "completed", "cancelled"].map((status) => ({ value: status, label: status === "All" ? "All statuses" : status }))}
          />
          <CompactSelect
            label="Readiness"
            value={readinessFilter}
            onChange={setReadinessFilter}
            options={["All", "Ready", "Partially Ready", "Missing Materials"].map((status) => ({ value: status, label: status }))}
          />
          <CompactSelect
            label="Material"
            value={materialTypeFilter}
            onChange={(value) => setMaterialTypeFilter(value as (typeof materialTypeFilters)[number])}
            options={materialTypeFilters.map((type) => ({ value: type, label: type === "All" ? "All material types" : type }))}
          />
          <CompactSelect
            label="Date range"
            value={dateRangeFilter}
            onChange={setDateRangeFilter}
            options={[
              { value: "All", label: "All dates" },
              { value: "Upcoming", label: "Upcoming" },
              { value: "This week", label: "This week" },
              { value: "Past", label: "Past" }
            ]}
          />
          <CompactSelect
            label="Sort"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "upcoming", label: "Upcoming first" },
              { value: "recent", label: "Recent first" },
              { value: "student", label: "Student" },
              { value: "status", label: "Status" },
              { value: "updated", label: "Recently updated" }
            ]}
          />
        </div>

        {weekLessons.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-[#FFF5F8] p-6 text-sm text-slate-600">
            {lessonSearch ? "No results found" : "Plan your first lesson and build your weekly flow."}
            <button
              type="button"
              onClick={openCreateForm}
              className="ml-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#FF4F7B]"
            >
              Open form
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {weekLessons.map((lesson) => {
              const attachedMaterials = getAttachedMaterials(lesson, materials);
              const readiness = getMaterialReadiness(attachedMaterials);
              const readinessStatus = getLessonReadinessStatus(lesson, attachedMaterials);
              return (
                <article
                  key={lesson.id}
                  className={`rounded-2xl border p-4 ${
                    lesson.status === "completed"
                      ? "border-emerald-100 bg-emerald-50/70"
                      : lesson.status === "cancelled"
                        ? "border-slate-200 bg-slate-100"
                        : "border-rose-100 bg-[#FFF5F8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">{lesson.date}</p>
                      <h3 className="mt-1 font-semibold text-[#1F2937]">{lesson.studentName}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={lesson.status} />
                      <LessonReadinessBadge status={readinessStatus} />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lesson.topic || lesson.lessonGoal}</p>
                  <div className="mt-3">
                    <MaterialReadinessPills readiness={readiness} compact />
                  </div>
                  <MaterialsQuickPreview lesson={lesson} attachedMaterials={attachedMaterials} compact />
                  <button
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#FF4F7B] transition hover:text-[#E63E69]"
                  >
                    <Eye size={14} aria-hidden="true" />
                    Open lesson · {attachedMaterials.length} materials
                  </button>
                  <button
                    type="button"
                    data-testid="delete-lesson"
                    onClick={() => {
                      if (deletingLessonId) return;
                      if (!window.confirm("Delete this lesson?")) return;
                      setDeletingLessonId(lesson.id);
                      setRecentlyCreatedLessons((current) => current.filter((item) => item.id !== lesson.id));
                      queueDeleteLessonWithUndo(lesson);
                      setDeletingLessonId(null);
                    }}
                    disabled={deletingLessonId === lesson.id}
                    className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {(isCreating || editingLesson) && (
        <div
          ref={formContainerRef}
          className={`scroll-mt-6 rounded-[1.75rem] transition-all duration-500 ${
            isFormHighlighted ? "ring-4 ring-[#FF4F7B]/20" : "ring-0 ring-transparent"
          }`}
        >
          <LessonPlanForm
            students={students}
            materials={materials}
            lesson={editingLesson}
            onAttachMaterial={attachMaterial}
            onDetachMaterial={detachMaterial}
            onCreated={(createdLesson) => {
              setRecentlyCreatedLessons((current) => [createdLesson, ...current.filter((item) => item.id !== createdLesson.id)]);
            }}
            onDone={() => {
              setIsCreating(false);
              setEditingLesson(null);
            }}
          />
        </div>
      )}

      {selectedLesson ? (
        <div ref={selectedLessonRef} className="scroll-mt-6">
          <LessonDetailsPanel
            lesson={selectedLesson}
            materials={materials}
            onClose={() => setSelectedLessonId("")}
            onAttach={attachMaterial}
            onDetach={detachMaterial}
            onGenerate={(type) =>
              `/ai-generator?student=${selectedLesson.studentId}&lesson=${selectedLesson.id}&type=${encodeURIComponent(type)}&topic=${encodeURIComponent(
                selectedLesson.topic || selectedLesson.title || ""
              )}&level=${selectedLesson.studentLevel}` as Route
            }
          />
        </div>
      ) : null}

      <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">Lesson management</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage lessons, attached materials, status, and prep from one place. {searchableLessons.length} lessons match the current filters.
            </p>
          </div>
          <span className="rounded-xl bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
            Page {currentLessonPage} / {totalLessonPages}
          </span>
        </div>
        {actionableLessons.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-6 text-sm text-slate-600">No upcoming planned lessons.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {actionableLessons.map((lesson) => {
              const attachedMaterials = getAttachedMaterials(lesson, materials);
              const readiness = getMaterialReadiness(attachedMaterials);
              const readinessStatus = getLessonReadinessStatus(lesson, attachedMaterials);
              return (
                <article
                  key={lesson.id}
                  className={`rounded-2xl border p-4 transition ${
                    selectedLessonId === lesson.id
                      ? "border-[#FF4F7B] bg-rose-50"
                      : lesson.status === "completed"
                        ? "border-emerald-100 bg-emerald-50/40"
                        : lesson.status === "cancelled"
                          ? "border-slate-200 bg-slate-50"
                          : "border-rose-100 bg-white"
                  }`}
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">
                      {lesson.date} · {lesson.durationMinutes} min
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#1F2937]">{lesson.studentName}</h3>
                      <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{lesson.studentLevel}</span>
                      <StatusBadge status={lesson.status} />
                      <LessonReadinessBadge status={readinessStatus} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#1F2937]">{lesson.topic || lesson.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{lesson.lessonGoal}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-xl bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {attachedMaterials.length} attached material{attachedMaterials.length === 1 ? "" : "s"}
                      </span>
                      <MaterialReadinessPills readiness={readiness} compact />
                    </div>
                    <MaterialsQuickPreview lesson={lesson} attachedMaterials={attachedMaterials} />
                    {lesson.status === "completed" && lesson.updatedAt ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        Completed on{" "}
                        {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
                          new Date(lesson.updatedAt)
                        )}
                      </p>
                    ) : null}
                    {lesson.status === "completed" && (lesson.teacherNotes || lesson.studentPerformance) ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCompletedNotes((current) =>
                              current.includes(lesson.id) ? current.filter((id) => id !== lesson.id) : [...current, lesson.id]
                            )
                          }
                          className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline"
                        >
                          {expandedCompletedNotes.includes(lesson.id) ? "Hide completion notes" : "View completion notes"}
                        </button>
                        {expandedCompletedNotes.includes(lesson.id) ? (
                          <div className="mt-2 rounded-xl border border-emerald-100 bg-white/80 p-3 text-xs text-slate-700">
                            {lesson.teacherNotes ? <p><span className="font-semibold">Notes:</span> {lesson.teacherNotes}</p> : null}
                            {lesson.studentPerformance ? (
                              <p className={lesson.teacherNotes ? "mt-1" : ""}>
                                <span className="font-semibold">Performance:</span> {lesson.studentPerformance}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]"
                    >
                      <Eye size={14} aria-hidden="true" />
                      Open lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <Link2 size={14} aria-hidden="true" />
                      Attach material
                    </button>
                    <Link
                      href={`/ai-generator?student=${lesson.studentId}&lesson=${lesson.id}&type=Speaking+questions&topic=${encodeURIComponent(
                        lesson.topic || lesson.title || ""
                      )}&level=${lesson.studentLevel}` as Route}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Generate material
                    </Link>
                    <button
                      onClick={() => openEditForm(lesson)}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                    {lesson.status === "planned" ? (
                      <button
                        data-testid="complete-lesson"
                        onClick={() => toggleLessonCompleted(lesson)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ${
                          statusActionState?.lessonId === lesson.id && statusActionState.mode === "completing"
                            ? "bg-emerald-600"
                            : "bg-[#FF4F7B] hover:bg-[#E63E69]"
                        }`}
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {statusActionState?.lessonId === lesson.id && statusActionState.mode === "completing" ? "Completing..." : "Complete"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="complete-lesson"
                        onClick={() => toggleLessonCompleted(lesson)}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100"
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        {statusActionState?.lessonId === lesson.id && statusActionState.mode === "undoing"
                          ? "Marking as planned..."
                          : "Completed"}
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="delete-lesson"
                      onClick={async () => {
                        if (deletingLessonId) return;
                        if (!window.confirm("Delete this lesson?")) return;
                        setDeletingLessonId(lesson.id);
                        setRecentlyCreatedLessons((current) => current.filter((item) => item.id !== lesson.id));
                        queueDeleteLessonWithUndo(lesson);
                        setDeletingLessonId(null);
                      }}
                      disabled={deletingLessonId === lesson.id}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {deletingLessonId === lesson.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
        {totalLessonPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setLessonPage((current) => Math.max(1, current - 1))}
              disabled={currentLessonPage === 1}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-slate-500">
              Showing {(currentLessonPage - 1) * lessonPageSize + 1}-{Math.min(currentLessonPage * lessonPageSize, searchableLessons.length)} of{" "}
              {searchableLessons.length}
            </p>
            <button
              type="button"
              onClick={() => setLessonPage((current) => Math.min(totalLessonPages, current + 1))}
              disabled={currentLessonPage === totalLessonPages}
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          completingLesson ? "max-h-[1200px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"
        }`}
      >
        {completingLesson ? (
          <CompleteLessonPanel
            lesson={completingLesson}
            onCompleted={() => {
              setStatusOverrides((current) => ({ ...current, [completingLesson.id]: "completed" }));
              router.refresh();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <AppSelect value={value} onChange={onChange} options={options} className="mt-1" />
    </label>
  );
}

function StatusBadge({ status }: { status: LessonPlan["status"] }) {
  const style =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "cancelled"
        ? "bg-slate-200 text-slate-600"
        : "bg-white text-slate-700";
  return <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${style}`}>{status === "completed" ? "Completed ✓" : status}</span>;
}

function LessonReadinessBadge({ status }: { status: LessonReadinessStatus }) {
  const style =
    status === "Ready"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Partially Ready"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-700";
  return <span className={`rounded-xl px-2 py-1 text-xs font-semibold ${style}`}>{status}</span>;
}

function MaterialReadinessPills({
  readiness,
  compact = false
}: {
  readiness: ReturnType<typeof getMaterialReadiness>;
  compact?: boolean;
}) {
  const labels = [
    ["Speaking", readiness.Speaking],
    ["Vocabulary", readiness.Vocabulary],
    ["Listening", readiness.Listening],
    ["Quiz", readiness.Quiz],
    ["Roleplay", readiness.Roleplay]
  ] as const;
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
      {labels.map(([label, ready]) => (
        <span
          key={label}
          className={`rounded-xl px-2 py-1 text-[11px] font-semibold ${
            ready ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-500"
          }`}
        >
          {label} {ready ? "✓" : "✗"}
        </span>
      ))}
    </div>
  );
}

function WorkspaceInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF5F8] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1F2937]">{value}</p>
    </div>
  );
}

function MaterialsQuickPreview({
  lesson,
  attachedMaterials,
  compact = false
}: {
  lesson: LessonPlan;
  attachedMaterials: TeachingMaterial[];
  compact?: boolean;
}) {
  const lastUpdated = getLessonLastUpdated(lesson, attachedMaterials);
  if (attachedMaterials.length === 0) {
    return (
      <div className={`mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-500 ${compact ? "line-clamp-2" : ""}`}>
        No materials attached yet · updated {lastUpdated}
      </div>
    );
  }
  return (
    <details className="group mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600">
      <summary className="cursor-pointer list-none font-semibold text-[#1F2937]">
        {attachedMaterials.length} material{attachedMaterials.length === 1 ? "" : "s"} attached · updated {lastUpdated}
        <span className="ml-1 text-[#FF4F7B] group-open:hidden">Preview</span>
        <span className="ml-1 hidden text-[#FF4F7B] group-open:inline">Hide</span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {attachedMaterials.map((material) => (
          <span key={material.id} className="rounded-xl bg-[#FFF5F8] px-2 py-1 font-semibold text-slate-700">
            {getMaterialKind(material)}: {material.title}
          </span>
        ))}
      </div>
    </details>
  );
}

function getLessonReadinessStatus(lesson: LessonPlan, attachedMaterials: TeachingMaterial[]): LessonReadinessStatus {
  if (attachedMaterials.length === 0) return "Missing Materials";
  if (lesson.studentId && (lesson.topic || lesson.title)) return "Ready";
  return "Partially Ready";
}

function matchesLessonDateRange(rawDate: string, range: string) {
  if (range === "All") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(`${rawDate}T00:00:00`);
  if (range === "Upcoming") return value >= today;
  if (range === "Past") return value < today;
  if (range === "This week") {
    const start = new Date(today);
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return value >= start && value < end;
  }
  return true;
}

function getLessonLastUpdated(lesson: LessonPlan, materials: TeachingMaterial[]) {
  const timestamps = [lesson.updatedAt, lesson.createdAt, ...materials.map((material) => material.createdAt)].filter(Boolean) as string[];
  if (timestamps.length === 0) return "recently";
  const latest = timestamps.sort((a, b) => b.localeCompare(a))[0];
  const date = new Date(latest);
  if (Number.isNaN(date.getTime())) return latest;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function applyAttachmentOverride(lesson: LessonPlan, overrideIds?: string[]): LessonPlan {
  if (!overrideIds) return lesson;
  const ids = Array.from(new Set(overrideIds.filter(Boolean)));
  return {
    ...lesson,
    materialId: ids[0] || null,
    lessonStructure: {
      ...lesson.lessonStructure,
      attachedMaterialIds: ids
    }
  };
}

function LessonDetailsPanel({
  lesson,
  materials,
  onClose,
  onAttach,
  onDetach,
  onGenerate
}: {
  lesson: LessonPlan;
  materials: TeachingMaterial[];
  onClose: () => void;
  onAttach: (lessonId: string, materialId: string) => Promise<boolean>;
  onDetach: (lessonId: string, materialId: string) => Promise<boolean>;
  onGenerate: (type: string) => Route;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const attachedMaterials = getAttachedMaterials(lesson, materials);
  const attachedIds = new Set(attachedMaterials.map((material) => material.id));
  const readiness = getMaterialReadiness(attachedMaterials);
  const availableMaterials = materials.filter((material) => !attachedIds.has(material.id));
  const groupedMaterials = groupMaterialsByKind(attachedMaterials);

  return (
    <section className="rounded-3xl border border-[#FF4F7B]/30 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Lesson Workspace</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">{lesson.topic || lesson.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{lesson.studentName}</span>
            <span>·</span>
            <span>{lesson.studentLevel}</span>
            <span>·</span>
            <span>{lesson.date}</span>
            <span>·</span>
            <span>{lesson.durationMinutes} min</span>
            <StatusBadge status={lesson.status} />
            <LessonReadinessBadge status={getLessonReadinessStatus(lesson, attachedMaterials)} />
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-600">
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <WorkspaceInfo label="Student" value={lesson.studentName} />
        <WorkspaceInfo label="Topic" value={lesson.topic || lesson.title || "Topic missing"} />
        <WorkspaceInfo label="Status" value={`${lesson.status} · ${getLessonReadinessStatus(lesson, attachedMaterials)}`} />
      </div>

      <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1F2937]">Attached material status</p>
            <p className="mt-1 text-xs text-slate-600">
              Status is based only on real materials linked to this lesson.
            </p>
          </div>
          <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
            {attachedMaterials.length} attached
          </span>
        </div>
        <div className="mt-3">
          <MaterialReadinessPills readiness={readiness} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,320px]">
        <div className="space-y-4">
          {lesson.teacherNotes || lesson.homeworkAssigned || lesson.studentPerformance ? (
            <section className="rounded-2xl border border-rose-100 bg-white p-4">
              <h3 className="font-semibold text-[#1F2937]">Notes</h3>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                {lesson.teacherNotes ? <p><span className="font-semibold text-[#1F2937]">Teacher notes:</span> {lesson.teacherNotes}</p> : null}
                {lesson.studentPerformance ? <p><span className="font-semibold text-[#1F2937]">Performance:</span> {lesson.studentPerformance}</p> : null}
                {lesson.homeworkAssigned ? <p><span className="font-semibold text-[#1F2937]">Homework:</span> {lesson.homeworkAssigned}</p> : null}
              </div>
            </section>
          ) : null}
          {Object.entries(groupedMaterials).map(([kind, items]) => (
            <section key={kind} className="rounded-2xl border border-rose-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#1F2937]">{materialGroupTitle(kind)}</h3>
                <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-xs font-semibold text-[#FF4F7B]">{items.length}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {items.map((material) => (
                  <article key={material.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF5F8] p-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{material.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {material.level} · {material.exerciseType} · {material.topic || "No topic"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/materials?material=${material.id}` as Route}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#FF4F7B]"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDetach(lesson.id, material.id)}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        Detach
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {attachedMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-[#FFF5F8] p-5 text-sm text-slate-600">
              No materials attached yet. Attach an existing material or generate one for this lesson.
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-rose-100 bg-white p-4">
            <h3 className="font-semibold text-[#1F2937]">Attach existing material</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Start with recommendations, then search or filter the library when you need something specific.
            </p>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
            >
              <Link2 size={16} aria-hidden="true" />
              Browse materials
            </button>
          </section>

          <section className="rounded-2xl border border-rose-100 bg-white p-4">
            <h3 className="font-semibold text-[#1F2937]">Generate for this lesson</h3>
            <div className="mt-3 grid gap-2">
              {["Speaking questions", "Vocabulary sheet", "Listening activity", "Quiz", "Roleplay"].map((type) => (
                <Link
                  key={type}
                  href={onGenerate(type)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                >
                  Generate {type}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {isPickerOpen ? (
        <MaterialPickerModal
          lesson={lesson}
          materials={availableMaterials}
          onClose={() => setIsPickerOpen(false)}
          onAttach={async (materialId) => {
            const ok = await onAttach(lesson.id, materialId);
            if (ok) setIsPickerOpen(false);
            return ok;
          }}
          generateHref={onGenerate("Speaking questions")}
        />
      ) : null}
    </section>
  );
}

function groupMaterialsByKind(materials: TeachingMaterial[]) {
  return materials.reduce<Record<string, TeachingMaterial[]>>((groups, material) => {
    const kind = getMaterialKind(material);
    groups[kind] = [...(groups[kind] || []), material];
    return groups;
  }, {});
}

function materialGroupTitle(kind: string) {
  if (kind === "Speaking") return "Speaking Questions";
  if (kind === "Vocabulary") return "Vocabulary Sheets";
  if (kind === "Listening") return "Listening Activities";
  if (kind === "Quiz") return "Quizzes";
  if (kind === "Roleplay") return "Roleplays";
  return "Other Materials";
}

function MaterialPickerModal({
  lesson,
  materials,
  onClose,
  onAttach,
  generateHref
}: {
  lesson: LessonPlan;
  materials: TeachingMaterial[];
  onClose: () => void;
  onAttach: (materialId: string) => Promise<boolean>;
  generateHref: Route;
}) {
  const pageSize = 12;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [studentFilter, setStudentFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [favoriteFilter, setFavoriteFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [attachingId, setAttachingId] = useState("");

  const scoredMaterials = useMemo(
    () =>
      materials
        .map((material) => ({
          material,
          score: getMaterialRecommendationScore(material, lesson)
        }))
        .sort((a, b) => b.score - a.score || (b.material.createdAt || "").localeCompare(a.material.createdAt || "")),
    [lesson, materials]
  );

  const typeOptions = useMemo(
    () => ["All", ...Array.from(new Set(materials.map((material) => getMaterialKind(material)).filter(Boolean)))],
    [materials]
  );
  const levelOptions = useMemo(
    () => ["All", ...Array.from(new Set(materials.map((material) => material.level).filter(Boolean))).sort()],
    [materials]
  );
  const studentOptions = useMemo(
    () => ["All", lesson.studentName, "Reusable", ...Array.from(new Set(materials.map((material) => material.studentName).filter(Boolean))).filter((name) => name !== lesson.studentName)],
    [lesson.studentName, materials]
  );
  const tagOptions = useMemo(
    () => ["All", ...Array.from(new Set(materials.flatMap((material) => getMaterialUserTags(material)))).sort((a, b) => a.localeCompare(b))],
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scoredMaterials
      .filter(({ material }) => {
        const tags = getMaterialUserTags(material);
        const searchable = [
          material.title,
          material.topic,
          material.summary,
          material.exerciseType,
          material.skill,
          material.level,
          material.studentName,
          material.metadata?.materialType,
          material.metadata?.topic,
          ...(material.metadata?.keywords || []),
          ...tags
        ]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesType = typeFilter === "All" || getMaterialKind(material) === typeFilter;
        const matchesLevel = levelFilter === "All" || material.level === levelFilter;
        const matchesStudent =
          studentFilter === "All" ||
          (studentFilter === "Reusable" ? !material.studentId : material.studentName === studentFilter);
        const matchesTag = tagFilter === "All" || tags.includes(tagFilter);
        const matchesFavorite = favoriteFilter === "All" || material.isFavorite;
        return matchesQuery && matchesType && matchesLevel && matchesStudent && matchesTag && matchesFavorite;
      })
      .map((item) => item.material);
  }, [favoriteFilter, levelFilter, query, scoredMaterials, studentFilter, tagFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [favoriteFilter, levelFilter, query, studentFilter, tagFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleMaterials = filteredMaterials.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const recommendedCount = scoredMaterials.filter((item) => item.score > 0).length;

  async function attach(materialId: string) {
    setAttachingId(materialId);
    try {
      await onAttach(materialId);
    } finally {
      setAttachingId("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <section
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Recommended for this lesson</p>
            <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Attach existing material</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {lesson.studentName} · {lesson.studentLevel} · {lesson.topic || lesson.title}
              {recommendedCount ? ` · ${recommendedCount} strong matches found` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-600">
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, topic, tags, student, or material type..."
              className="w-full rounded-2xl border border-rose-100 py-3 pl-10 pr-10 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-[#FF4F7B]"
                aria-label="Clear material search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <CompactSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions.map((type) => ({ value: type, label: type }))} />
            <CompactSelect label="Level" value={levelFilter} onChange={setLevelFilter} options={levelOptions.map((level) => ({ value: level, label: level }))} />
            <CompactSelect label="Student" value={studentFilter} onChange={setStudentFilter} options={studentOptions.map((student) => ({ value: student, label: student }))} />
            <CompactSelect label="Tags" value={tagFilter} onChange={setTagFilter} options={tagOptions.map((tag) => ({ value: tag, label: tag }))} />
            <CompactSelect
              label="Favorites"
              value={favoriteFilter}
              onChange={setFavoriteFilter}
              options={[
                { value: "All", label: "All" },
                { value: "Favorites", label: "Favorites" }
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-[#1F2937]">{filteredMaterials.length}</span> materials found
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("All");
                setLevelFilter("All");
                setStudentFilter("All");
                setTagFilter("All");
                setFavoriteFilter("All");
              }}
              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]"
            >
              Clear filters
            </button>
          </div>

          {visibleMaterials.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-rose-200 bg-[#FFF5F8] p-8 text-center">
              <p className="font-semibold text-[#1F2937]">No matching materials found</p>
              <p className="mt-2 text-sm text-slate-600">Generate a fresh material for this lesson and it will attach after saving.</p>
              <Link href={generateHref} className="mt-4 inline-flex rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white">
                Generate new material
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {visibleMaterials.map((material) => (
                <article key={material.id} className="rounded-2xl border border-rose-100 bg-white p-4 transition hover:border-[#FF4F7B]/50 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {material.isFavorite ? <Star size={14} className="text-[#FF4F7B]" fill="currentColor" aria-hidden="true" /> : null}
                        <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-[11px] font-semibold text-[#FF4F7B]">{getMaterialKind(material)}</span>
                        <span className="rounded-xl bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{material.level}</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-[#1F2937]">{material.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => attach(material.id)}
                      disabled={attachingId === material.id}
                      className="shrink-0 rounded-xl bg-[#FF4F7B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {attachingId === material.id ? "Attaching..." : "Attach"}
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{material.summary || material.topic || "No preview saved."}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-xl bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{material.studentName || "Reusable"}</span>
                    {material.topic ? <span className="rounded-xl bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{material.topic}</span> : null}
                    {getMaterialUserTags(material).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-xl bg-rose-50 px-2 py-1 text-[11px] font-semibold text-[#FF4F7B]">{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-slate-500">
                Page {currentPage} / {totalPages}
              </p>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function getMaterialRecommendationScore(material: TeachingMaterial, lesson: LessonPlan) {
  let score = 0;
  const materialTopic = (material.topic || material.metadata?.topic || "").toLowerCase();
  const lessonTopic = (lesson.topic || lesson.title || "").toLowerCase();
  if (materialTopic && lessonTopic && (materialTopic.includes(lessonTopic) || lessonTopic.includes(materialTopic))) score += 5;
  if (material.level === lesson.studentLevel) score += 4;
  if (material.studentId === lesson.studentId) score += 4;
  if (!material.studentId) score += 1;
  if (material.isFavorite) score += 2;
  if ((material.skill || "").toLowerCase().includes((lesson.skillFocus || "").toLowerCase())) score += 1;
  if ((material.createdAt || "").slice(0, 7) === new Date().toISOString().slice(0, 7)) score += 1;
  return score;
}

function getMaterialUserTags(material: TeachingMaterial) {
  const tags = material.content?.userTags || [];
  return Array.from(new Set((Array.isArray(tags) ? tags : []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
}

function MaterialSelectionField({
  lesson,
  selectedMaterial,
  student,
  topic,
  skillFocus,
  structure,
  materials,
  isPickerOpen,
  onOpenPicker,
  onClosePicker,
  onSelect,
  onRemove
}: {
  lesson: LessonPlan | null;
  selectedMaterial: TeachingMaterial | null;
  student: TeachingStudent;
  topic: string;
  skillFocus: string;
  structure: LessonStructure;
  materials: TeachingMaterial[];
  isPickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSelect: (materialId: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const pickerLesson = lesson || createDraftLessonForPicker({ student, topic, skillFocus, structure, materialId: selectedMaterial?.id || null });
  const availableMaterials = materials.filter((material) => material.id !== selectedMaterial?.id);

  return (
    <section className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Selected saved material</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Use the same searchable material browser used across LessonFlow.</p>
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#FF4F7B] transition hover:text-[#E63E69]"
        >
          {selectedMaterial ? "Replace material" : "Select saved material"}
        </button>
      </div>

      {selectedMaterial ? (
        <div className="mt-3 rounded-2xl bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-[11px] font-semibold text-[#FF4F7B]">{getMaterialKind(selectedMaterial)}</span>
                <span className="rounded-xl bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{selectedMaterial.level}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#1F2937]">{selectedMaterial.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{selectedMaterial.summary || selectedMaterial.topic || "No preview saved."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/materials?material=${selectedMaterial.id}` as Route} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-[#FF4F7B]">
                Open material
              </Link>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-xl bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{selectedMaterial.studentName || "Reusable"}</span>
            {getMaterialUserTags(selectedMaterial).slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-xl bg-rose-50 px-2 py-1 text-[11px] font-semibold text-[#FF4F7B]">{tag}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-rose-200 bg-white p-4 text-sm text-slate-600">
          No saved material selected yet.
        </div>
      )}

      {isPickerOpen ? (
        <MaterialPickerModal
          lesson={pickerLesson}
          materials={availableMaterials}
          onClose={onClosePicker}
          onAttach={onSelect}
          generateHref={`/ai-generator?student=${student.id}&type=Speaking+questions&topic=${encodeURIComponent(topic || student.nextSuggestedFocus || "")}&level=${student.level}` as Route}
        />
      ) : null}
    </section>
  );
}

function createDraftLessonForPicker({
  student,
  topic,
  skillFocus,
  structure,
  materialId
}: {
  student: TeachingStudent;
  topic: string;
  skillFocus: string;
  structure: LessonStructure;
  materialId: string | null;
}): LessonPlan {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "draft-lesson",
    studentId: student.id,
    studentName: student.name,
    studentLevel: student.level,
    materialId,
    materialTitle: "",
    rawDate: today,
    date: today,
    durationMinutes: 45,
    status: "planned",
    title: topic || student.nextSuggestedFocus || "Draft lesson",
    focus: skillFocus,
    topic,
    skillFocus,
    lessonGoal: topic || student.nextSuggestedFocus || "Draft lesson",
    lessonStructure: structure,
    teacherNotes: "",
    homeworkAssigned: "",
    studentPerformance: ""
  };
}

function LessonPlanForm({
  students,
  materials,
  lesson,
  onAttachMaterial,
  onDetachMaterial,
  onCreated,
  onDone
}: {
  students: TeachingStudent[];
  materials: TeachingMaterial[];
  lesson: LessonPlan | null;
  onAttachMaterial: (lessonId: string, materialId: string) => Promise<boolean>;
  onDetachMaterial: (lessonId: string, materialId: string) => Promise<boolean>;
  onCreated: (lesson: LessonPlan) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    lesson ? updateLessonPlanAction.bind(null, lesson.id) : createLessonPlanAction,
    {}
  );
  const [studentId, setStudentId] = useState(lesson?.studentId || students[0]?.id || "");
  const selectedStudent = students.find((student) => student.id === studentId) || students[0];
  const studentMaterials = materials.filter((material) => !material.studentId || material.studentId === studentId);
  const [topic, setTopic] = useState(lesson?.topic || selectedStudent?.nextSuggestedFocus || selectedStudent?.interests[0] || "");
  const [lessonGoal, setLessonGoal] = useState(
    lesson?.lessonGoal ||
      `Help ${selectedStudent?.name || "student"} improve ${selectedStudent?.nextSuggestedFocus || "target speaking skills"}`
  );
  const [skillFocus, setSkillFocus] = useState(lesson?.skillFocus || "Speaking");
  const [structure, setStructure] = useState<LessonStructure>(
    lesson?.lessonStructure || defaultLessonStructure(topic, skillFocus)
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState(lesson?.materialId || "");
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId) || null;
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    setSelectedMaterialId(lesson?.materialId || "");
  }, [lesson?.materialId]);

  useEffect(() => {
    if (state.ok) {
      showToast({ type: "success", title: lesson ? "Lesson updated" : "Lesson created", description: "Your planner has been saved." });
      onDone();
      router.refresh();
    }
    if (state.error) {
      showToast({ type: "error", title: "Lesson could not be saved", description: state.error });
    }
  }, [lesson, onDone, router, skillFocus, state.error, state.ok, studentId, topic]);

  useEffect(() => {
    if (lesson) return;
    const nextTopic = selectedStudent?.nextSuggestedFocus || selectedStudent?.interests[0] || "";
    const nextFocus = selectedStudent?.grammarWeaknesses.length ? "Grammar" : "Speaking";
    setTopic(nextTopic);
    setLessonGoal(`Help ${selectedStudent?.name || "student"} improve ${nextTopic || "target speaking skills"}`);
    setSkillFocus(nextFocus);
    setStructure(defaultLessonStructure(nextTopic, nextFocus));
  }, [lesson, selectedStudent]);

  function regenerateStructure() {
    setStructure(defaultLessonStructure(topic, skillFocus));
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (lesson) return;
    event.preventDefault();
    setManualError("");
    setIsCreatingLesson(true);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        studentId: String(formData.get("studentId") || ""),
        date: String(formData.get("date") || ""),
        durationMinutes: Number(formData.get("durationMinutes") || 45),
        status: String(formData.get("status") || "planned"),
        lessonGoal: String(formData.get("lessonGoal") || ""),
        topic: String(formData.get("topic") || ""),
        skillFocus: String(formData.get("skillFocus") || "Speaking"),
        materialId: String(formData.get("materialId") || "") || null,
        teacherNotes: String(formData.get("teacherNotes") || ""),
        lessonStructure: {
          warmUp: String(formData.get("warmUp") || ""),
          review: String(formData.get("review") || ""),
          mainSpeakingTask: String(formData.get("mainSpeakingTask") || ""),
          vocabularyActivation: String(formData.get("vocabularyActivation") || ""),
          listeningReadingActivity: String(formData.get("listeningReadingActivity") || ""),
          correctionAndFeedback: String(formData.get("correctionAndFeedback") || ""),
          homework: String(formData.get("homework") || "")
        }
      };

      const response = await fetch("/api/lessons/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; lesson?: LessonPlan };
      if (!response.ok || !result.ok || !result.lesson) {
        throw new Error(result.error || "Could not create lesson plan.");
      }

      onCreated(result.lesson);
      showToast({ type: "success", title: "Lesson created", description: "Your planner has been saved." });
      onDone();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create lesson plan.";
      setManualError(message);
      showToast({ type: "error", title: "Lesson could not be saved", description: message });
    } finally {
      setIsCreatingLesson(false);
    }
  }

  return (
    <form action={lesson ? formAction : undefined} onSubmit={handleCreateSubmit} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">{lesson ? "Edit lesson" : "New lesson plan"}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Plan with student memory</h2>
        </div>
        <button type="button" onClick={onDone} className="text-sm font-semibold text-slate-500">
          Close
        </button>
      </div>

      {state.error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      {manualError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{manualError}</p> : null}
      {state.ok ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Lesson saved.</p> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr,360px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Student" name="studentId" value={studentId} onChange={setStudentId}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
            <Field label="Date" name="date" type="date" defaultValue={lesson?.rawDate || new Date().toISOString().slice(0, 10)} />
            <Select label="Duration" name="durationMinutes" defaultValue={String(lesson?.durationMinutes || 45)}>
              {durationOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </Select>
            <Select label="Status" name="status" defaultValue={lesson?.status || "planned"}>
              {["planned", "completed", "cancelled"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <Field label="Lesson goal" name="lessonGoal" value={lessonGoal} onChange={setLessonGoal} />
          <Field label="Topic" name="topic" value={topic} onChange={setTopic} />
          <Select label="Skill focus" name="skillFocus" value={skillFocus} onChange={setSkillFocus}>
            {skillFocusOptions.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </Select>
          <MaterialSelectionField
            lesson={lesson}
            selectedMaterial={selectedMaterial}
            student={selectedStudent}
            topic={topic}
            skillFocus={skillFocus}
            structure={structure}
            materials={materials}
            isPickerOpen={isMaterialPickerOpen}
            onOpenPicker={() => setIsMaterialPickerOpen(true)}
            onClosePicker={() => setIsMaterialPickerOpen(false)}
            onSelect={async (materialId) => {
              const ok = lesson ? await onAttachMaterial(lesson.id, materialId) : true;
              if (!ok) return false;
              setSelectedMaterialId(materialId);
              if (!lesson) showToast({ type: "success", title: "Material selected" });
              setIsMaterialPickerOpen(false);
              return true;
            }}
            onRemove={async () => {
              const materialId = selectedMaterialId;
              const ok = lesson && materialId ? await onDetachMaterial(lesson.id, materialId) : true;
              if (!ok) return false;
              setSelectedMaterialId("");
              if (!lesson) showToast({ type: "success", title: "Material removed" });
              return true;
            }}
          />
          <input type="hidden" name="materialId" value={selectedMaterialId} />
          <TextArea label="Teacher notes" name="teacherNotes" defaultValue={lesson?.teacherNotes || ""} />
        </div>

        <StudentContext student={selectedStudent} materials={studentMaterials} />
      </div>

      <section className="mt-5 rounded-3xl bg-[#FFF5F8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-[#1F2937]">Suggested lesson structure</h3>
          <button type="button" onClick={regenerateStructure} className="text-sm font-semibold text-[#FF4F7B]">
            Regenerate suggestion
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <StructureField label="Warm-up" name="warmUp" value={structure.warmUp} onChange={(value) => setStructure({ ...structure, warmUp: value })} />
          <StructureField label="Review" name="review" value={structure.review} onChange={(value) => setStructure({ ...structure, review: value })} />
          <StructureField label="Main speaking task" name="mainSpeakingTask" value={structure.mainSpeakingTask} onChange={(value) => setStructure({ ...structure, mainSpeakingTask: value })} />
          <StructureField label="Vocabulary activation" name="vocabularyActivation" value={structure.vocabularyActivation} onChange={(value) => setStructure({ ...structure, vocabularyActivation: value })} />
          <StructureField label="Listening/reading activity" name="listeningReadingActivity" value={structure.listeningReadingActivity} onChange={(value) => setStructure({ ...structure, listeningReadingActivity: value })} />
          <StructureField label="Correction and feedback" name="correctionAndFeedback" value={structure.correctionAndFeedback} onChange={(value) => setStructure({ ...structure, correctionAndFeedback: value })} />
          <StructureField label="Homework" name="homework" value={structure.homework} onChange={(value) => setStructure({ ...structure, homework: value })} />
        </div>
      </section>
      <SubmitButton
        label={lesson ? "Save lesson" : "Create lesson plan"}
        loadingLabel={lesson ? "Saving..." : "Creating..."}
        forcePending={isCreatingLesson}
        dataTestId={lesson ? "save-lesson" : "create-lesson"}
      />
    </form>
  );
}

function StudentContext({ student, materials }: { student: TeachingStudent; materials: TeachingMaterial[] }) {
  return (
    <aside className="rounded-3xl bg-[#FFF5F8] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Student context</p>
      <div className="mt-3 grid gap-3 text-sm text-slate-700">
        <Context label="Level" value={student.level} />
        <Context label="Goals" value={student.goals.join("; ") || "No goals saved"} />
        <Context label="Interests" value={student.interests.join(", ") || "No interests saved"} />
        <Context label="Recurring mistakes" value={student.recurringMistakes.join("; ") || "No mistakes saved"} />
        <Context label="Vocabulary to review" value={student.vocabularyToReview.join(", ") || "No vocabulary saved"} />
        <Context label="Last lesson topic" value={student.lessonHistory[0]?.topic || student.lessonHistory[0]?.title || "No lesson history"} />
        <Context label="Suggested next focus" value={student.nextSuggestedFocus} />
        <Context label="Review items" value={student.memorySummary.reviewNext.join(", ") || "No review items yet"} />
        <Context label="Relevant saved materials" value={materials.slice(0, 3).map((material) => material.title).join(", ") || "No saved materials yet"} />
        <Context label="Suggested homework" value={student.aiSuggestions.suggestedHomework} />
      </div>
    </aside>
  );
}

function CompleteLessonPanel({
  lesson,
  onCompleted
}: {
  lesson: LessonPlan;
  onCompleted: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">Complete lesson</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">{lesson.studentName} · {lesson.date}</h2>
        </div>
      </div>
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            const formData = new FormData(event.currentTarget);
            if (process.env.NODE_ENV === "development") {
              console.info("[lessons.complete.ui] request", {
                lesson_id: lesson.id,
                previous_status: lesson.status,
                new_status: "completed"
              });
            }
            const response = await fetch("/api/lessons/complete", {
              method: "POST",
              body: formData
            });
            const payload = (await response.json()) as { ok?: boolean; error?: string };
            if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not complete lesson.");
            showToast({ type: "success", title: "Lesson completed" });
            onCompleted();
          } catch (error) {
            showToast({
              type: "error",
              title: "Complete failed",
              description: error instanceof Error ? error.message : "Could not complete lesson."
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <input type="hidden" name="lessonId" value={lesson.id} />
        <TextArea label="Lesson notes" name="lessonNotes" defaultValue={lesson.teacherNotes || ""} />
        <TextArea label="Student performance" name="studentPerformance" defaultValue={lesson.studentPerformance || ""} />
        <TextArea label="Homework assigned" name="homeworkAssigned" defaultValue={lesson.lessonStructure.homework} />

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="w-fit rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          {showAdvanced ? "Hide advanced notes" : "Show advanced notes"}
        </button>

        {showAdvanced ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TextArea label="New mistakes noticed" name="newMistakesNoticed" />
            <TextArea label="Vocabulary to review next time" name="vocabularyToReviewNext" />
            <TextArea label="Strengths" name="strengths" />
            <TextArea label="Listening/speaking observations" name="listeningWeaknesses" />
            <Select label="Updated speaking confidence" name="speakingConfidence" defaultValue="Developing">
              {["Low", "Developing", "Confident", "Advanced"].map((confidence) => (
                <option key={confidence} value={confidence}>{confidence}</option>
              ))}
            </Select>
            <TextArea label="Notes for next class" name="notesForNextClass" />
          </div>
        ) : null}
        {!showAdvanced ? (
          <Select label="Updated speaking confidence" name="speakingConfidence" defaultValue="Developing">
            {["Low", "Developing", "Confident", "Advanced"].map((confidence) => (
              <option key={confidence} value={confidence}>{confidence}</option>
            ))}
          </Select>
        ) : null}
        <div>
          <SubmitButton label="Save completion notes" loadingLabel="Saving..." forcePending={isSubmitting} dataTestId="complete-lesson" />
        </div>
      </form>
    </section>
  );
}

function Context({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold text-[#1F2937]">{label}:</span> {value}</p>;
}

function Field({ label, name, type = "text", defaultValue = "", value, onChange }: { label: string; name: string; type?: string; defaultValue?: string; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input name={name} type={type} defaultValue={value === undefined ? defaultValue : undefined} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="mt-2 w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-[#FF4F7B] focus:ring-2" />
    </label>
  );
}

function Select({ label, name, children, defaultValue, value, onChange }: { label: string; name: string; children: React.ReactNode; defaultValue?: string; value?: string; onChange?: (value: string) => void }) {
  const options = useMemo(
    () =>
      (Array.isArray(children) ? children : [children])
        .filter(Boolean)
        .map((node) => {
          if (!node || typeof node !== "object" || !("props" in node)) return null;
          const option = node as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
          const optionValue = String(option.props.value ?? "");
          const label =
            typeof option.props.children === "string"
              ? option.props.children
              : Array.isArray(option.props.children)
                ? option.props.children.join("")
                : optionValue;
          return { value: optionValue, label };
        })
        .filter((item): item is { value: string; label: string } => Boolean(item)),
    [children]
  );

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <AppSelect
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        options={options}
        className="mt-2"
      />
    </label>
  );
}

function TextArea({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea name={name} defaultValue={defaultValue} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-rose-100 px-3 py-2 text-sm leading-6 outline-none ring-[#FF4F7B] focus:ring-2" />
    </label>
  );
}

function StructureField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 outline-none ring-[#FF4F7B] focus:ring-2" />
    </label>
  );
}

function SubmitButton({
  label,
  loadingLabel,
  forcePending = false,
  dataTestId
}: {
  label: string;
  loadingLabel: string;
  forcePending?: boolean;
  dataTestId?: string;
}) {
  const { pending } = useFormStatus();
  const isPending = forcePending || pending;
  return (
    <button
      type="submit"
      data-testid={dataTestId}
      disabled={isPending}
      className="mt-5 rounded-xl bg-[#FF4F7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:bg-slate-400"
    >
      {isPending ? loadingLabel : label}
    </button>
  );
}
