"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  completeLessonPlan,
  createLessonPlanWithClient,
  deleteLessonPlan,
  parseCompleteLessonFormData,
  parseLessonPlanFormData,
  updateLessonPlan
} from "@/lib/supabase/teaching-data";

export type LessonActionState = {
  ok?: boolean;
  error?: string;
  lessonId?: string;
};

export async function createLessonPlanAction(
  _state: LessonActionState,
  formData: FormData
): Promise<LessonActionState> {
  try {
    const { user, supabase } = await requireUser();
    const {
      data: { user: insertUser },
      error: insertUserError
    } = await supabase.auth.getUser();

    if (insertUserError || !insertUser) {
      throw new Error("No authenticated Supabase session found for lesson creation.");
    }
    if (insertUser.id !== user.id) {
      throw new Error("Supabase session mismatch detected before lesson insert.");
    }

    const input = parseLessonPlanFormData(formData);
    const lessonId = await createLessonPlanWithClient(supabase, user.id, input);
    trackEvent("lesson_created", { studentId: input.studentId, skillFocus: input.skillFocus, topicPresent: Boolean(input.topic) });
    revalidatePath("/lesson-planner");
    revalidatePath("/weekly-prep");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return { ok: true, lessonId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create lesson plan." };
  }
}

export async function updateLessonPlanAction(
  lessonId: string,
  _state: LessonActionState,
  formData: FormData
): Promise<LessonActionState> {
  try {
    const { user } = await requireUser();
    await updateLessonPlan(user.id, lessonId, parseLessonPlanFormData(formData));
    revalidatePath("/lesson-planner");
    revalidatePath("/weekly-prep");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update lesson plan." };
  }
}

export async function completeLessonPlanAction(formData: FormData) {
  const { user } = await requireUser();
  const lessonId = String(formData.get("lessonId") || "");
  if (lessonId) {
    await completeLessonPlan(user.id, lessonId, parseCompleteLessonFormData(formData));
  }
  revalidatePath("/lesson-planner");
  revalidatePath("/weekly-prep");
  revalidatePath("/dashboard");
  revalidatePath("/students");
}

export async function deleteLessonPlanAction(formData: FormData) {
  const { user } = await requireUser();
  const lessonId = String(formData.get("lessonId") || "");
  if (lessonId) await deleteLessonPlan(user.id, lessonId);
  revalidatePath("/lesson-planner");
  revalidatePath("/weekly-prep");
  revalidatePath("/dashboard");
  revalidatePath("/students");
}
