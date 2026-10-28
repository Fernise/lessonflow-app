"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { generateTeachingMaterial, AiServiceError } from "@/lib/ai/material-service";
import { generateMockMaterial } from "@/lib/mock-generation";
import {
  assignMaterialToLesson,
  getStudentProfile,
  listLessonPlans,
  listMaterials,
  listStudents,
  listWeeklyPreparations,
  markWeeklyPreparationPrepared,
  saveGeneratedMaterial,
  saveWeeklyPreparation
} from "@/lib/supabase/teaching-data";
import type { WeeklyPreparationSuggestion } from "@/lib/teaching-types";
import { buildWeeklyPreparationSuggestions } from "@/lib/weekly-prep";

export type PrepareWeekActionState = {
  ok?: boolean;
  error?: string;
  weekStart?: string;
};

export type GenerateWeeklyQuizActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export async function prepareWeekAction(formData: FormData) {
  const { user } = await requireUser();
  const weekStart = String(formData.get("weekStart") || "");
  const [{ students }, { lessons }, { materials }] = await Promise.all([listStudents(), listLessonPlans(), listMaterials()]);
  const suggestions = buildWeeklyPreparationSuggestions({ weekStart, students, lessons, materials });
  const summary = `${suggestions.priorityLessons.length} priorities, ${suggestions.sharedTopics.length} shared topic groups, ${suggestions.vocabularyReviewList.length} vocabulary items.`;
  await saveWeeklyPreparation(user.id, { weekStart, summary, suggestions });
  trackEvent("prepare_my_week_clicked", {
    weekStart,
    count: suggestions.checklist.length
  });
  revalidatePath("/weekly-prep");
}

export async function prepareWeekActionState(
  _state: PrepareWeekActionState,
  formData: FormData
): Promise<PrepareWeekActionState> {
  try {
    const { user } = await requireUser();
    const weekStart = String(formData.get("weekStart") || "");
    if (!weekStart) return { error: "Please select a valid week." };
    const [{ students }, { lessons }, { materials }] = await Promise.all([listStudents(), listLessonPlans(), listMaterials()]);
    const suggestions = buildWeeklyPreparationSuggestions({ weekStart, students, lessons, materials });
    const summary = `${suggestions.priorityLessons.length} priorities, ${suggestions.sharedTopics.length} shared topics, ${suggestions.vocabularyReviewList.length} vocabulary items.`;
    await saveWeeklyPreparation(user.id, { weekStart, summary, suggestions });
    trackEvent("prepare_my_week_clicked", {
      weekStart,
      count: suggestions.checklist.length
    });
    revalidatePath("/weekly-prep");
    return { ok: true, weekStart };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not prepare this week." };
  }
}

export async function markPreparedAction(formData: FormData) {
  const { user } = await requireUser();
  const preparationId = String(formData.get("preparationId") || "");
  if (preparationId) await markWeeklyPreparationPrepared(user.id, preparationId);
  revalidatePath("/weekly-prep");
}

export async function assignMaterialAction(formData: FormData) {
  const { user } = await requireUser();
  const lessonId = String(formData.get("lessonId") || "");
  const materialId = String(formData.get("materialId") || "");
  if (lessonId && materialId) await assignMaterialToLesson(user.id, lessonId, materialId);
  if (lessonId && materialId) {
    trackEvent("reusable_material_used", { lessonId, materialId });
    trackEvent("material_reused", { lessonId, materialId });
  }
  revalidatePath("/weekly-prep");
  revalidatePath("/lesson-planner");
}

export async function markChecklistLessonPreparedAction(formData: FormData) {
  const { user } = await requireUser();
  const weekStart = String(formData.get("weekStart") || "");
  const lessonId = String(formData.get("lessonId") || "");
  if (!weekStart || !lessonId) return;

  const [{ preparations }, { students }, { lessons }, { materials }] = await Promise.all([
    listWeeklyPreparations(),
    listStudents(),
    listLessonPlans(),
    listMaterials()
  ]);
  const baseSuggestions =
    preparations.find((prep) => prep.weekStart === weekStart)?.suggestions ||
    buildWeeklyPreparationSuggestions({ weekStart, students, lessons, materials });

  const nextSuggestions: WeeklyPreparationSuggestion = {
    ...baseSuggestions,
    checklist: baseSuggestions.checklist.map((item) =>
      item.lessonId === lessonId
        ? {
            ...item,
            lessonPlanReady: true,
            speakingMaterialReady: true,
            vocabularyMaterialReady: true,
            materialReady: true,
            homeworkReady: true,
            notesReady: true
          }
        : item
    )
  };
  const readyCount = nextSuggestions.checklist.filter((item) => item.lessonPlanReady && item.materialReady && item.notesReady).length;
  const summary = `${readyCount}/${nextSuggestions.checklist.length} lessons marked ready for this week.`;
  await saveWeeklyPreparation(user.id, { weekStart, suggestions: nextSuggestions, summary, status: "draft" });
  revalidatePath("/weekly-prep");
}

export async function savePreparedSuggestions(
  weekStart: string,
  suggestions: WeeklyPreparationSuggestion,
  summary: string
) {
  const { user } = await requireUser();
  await saveWeeklyPreparation(user.id, { weekStart, suggestions, summary });
  revalidatePath("/weekly-prep");
}

export async function generateWeeklyQuizActionState(
  _state: GenerateWeeklyQuizActionState,
  formData: FormData
): Promise<GenerateWeeklyQuizActionState> {
  try {
    const { user } = await requireUser();
    const lessonId = String(formData.get("lessonId") || "");
    const weekStart = String(formData.get("weekStart") || "");
    if (!lessonId) return { error: "Lesson is required." };

    const [{ lessons }, { materials }] = await Promise.all([listLessonPlans(), listMaterials()]);
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return { error: "Lesson not found." };

    const { student, error: studentError } = await getStudentProfile(lesson.studentId);
    if (studentError) return { error: studentError };
    if (!student) return { error: "Student not found." };

    const normalizedTopic = (lesson.topic || lesson.title || "").trim().toLowerCase();
    const relatedMaterial = materials.find((material) => {
      if (material.studentId !== lesson.studentId) return false;
      if (!normalizedTopic) return true;
      return material.topic.trim().toLowerCase() === normalizedTopic;
    });
    const hasRelatedMaterial = Boolean(relatedMaterial?.content);

    const duration = `${lesson.durationMinutes || 45} minutes`;
    const topic = lesson.topic || lesson.lessonGoal || lesson.title || student.nextSuggestedFocus || "General review";
    const input = {
      student,
      materialType: "Quiz" as const,
      level: lesson.studentLevel || student.level,
      topic,
      skillFocus: lesson.skillFocus || "Vocabulary / Speaking review",
      duration,
      extraInstructions: hasRelatedMaterial
        ? "Use the linked material context to build a focused review quiz."
        : "No related material found. Build the quiz from lesson topic, student profile and teaching memory only.",
      variation: 1,
      mode: "Conversational" as const
    };

    let content;
    try {
      const generated = await generateTeachingMaterial(input);
      content = generated.content;
    } catch (error) {
      if (error instanceof AiServiceError && error.code === "missing_api_key") {
        content = generateMockMaterial(input);
      } else {
        const message = error instanceof Error ? error.message : "Could not generate quiz.";
        return { error: message };
      }
    }

    const materialId = await saveGeneratedMaterial(user.id, {
      studentId: lesson.studentId,
      materialType: "Quiz",
      topic,
      level: input.level,
      skillFocus: input.skillFocus,
      content
    });

    await assignMaterialToLesson(user.id, lessonId, materialId);

    if (weekStart) {
      const [{ students }, { lessons: refreshedLessons }, { materials: refreshedMaterials }] = await Promise.all([
        listStudents(),
        listLessonPlans(),
        listMaterials()
      ]);
      const suggestions = buildWeeklyPreparationSuggestions({
        weekStart,
        students,
        lessons: refreshedLessons,
        materials: refreshedMaterials
      });
      const summary = `${suggestions.priorityLessons.length} priorities, ${suggestions.sharedTopics.length} shared topics, ${suggestions.vocabularyReviewList.length} vocabulary items.`;
      await saveWeeklyPreparation(user.id, { weekStart, summary, suggestions, status: "draft" });
    }

    revalidatePath("/weekly-prep");
    revalidatePath("/lesson-planner");
    revalidatePath("/materials");
    return {
      ok: true,
      message: hasRelatedMaterial
        ? "Quiz generated from related material and linked to the lesson."
        : "No related material found. Quiz generated from topic and student context."
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate quiz for this lesson." };
  }
}
