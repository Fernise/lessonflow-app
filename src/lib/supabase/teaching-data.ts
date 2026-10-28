import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CefrLevel } from "@/lib/types";
import { defaultLessonStructure } from "@/lib/lesson-structure";
import { withAttachedMaterialId, withoutAttachedMaterialId } from "@/lib/lesson-materials";
import { extractMaterialMetadata } from "@/lib/material-intelligence";
import { buildWeeklyPreparationSuggestions, getCurrentWeekStart } from "@/lib/weekly-prep";
import type {
  AiSuggestions,
  AiGenerationHistoryItem,
  GeneratedMaterialContent,
  LessonStatus,
  LessonStructure,
  LessonPlanSummary,
  MaterialMetadata,
  MaterialType,
  MemoryCategory,
  SpeakingConfidence,
  TeachingMemoryItem,
  TeachingMaterial,
  TeachingStudent,
  WeeklyPreparation,
  WeeklyPreparationStatus,
  WeeklyPreparationSuggestion
} from "@/lib/teaching-types";

type StudentRow = {
  id: string;
  user_id: string;
  name: string;
  level: CefrLevel;
  native_language: string;
  goals: string[] | null;
  interests: string[] | null;
  lesson_frequency: string;
  notes: string;
  last_lesson_at: string | null;
  created_at: string;
  updated_at: string;
  student_memory?: StudentMemoryRow | StudentMemoryRow[] | null;
  lessons?: LessonRow[] | null;
  materials?: MaterialRow[] | null;
};

type StudentMemoryRow = {
  id: string;
  user_id: string;
  student_id: string;
  recurring_mistakes: string[] | null;
  grammar_weaknesses: string[] | null;
  vocabulary_to_review: string[] | null;
  pronunciation_notes: string[] | null;
  speaking_confidence: SpeakingConfidence;
  listening_weaknesses: string[] | null;
  preferred_topics: string[] | null;
  avoided_topics: string[] | null;
  repeated_topics: string[] | null;
  strengths: string[] | null;
  notes_for_next_class: string;
  next_suggested_focus: string;
};

type LessonRow = {
  id: string;
  created_at?: string;
  updated_at?: string;
  student_id?: string;
  material_id?: string | null;
  lesson_date: string;
  duration_minutes?: number;
  status?: LessonStatus;
  title: string;
  topic?: string;
  skill_focus?: string;
  lesson_goal?: string;
  lesson_structure?: LessonStructure | null;
  topics_covered: string[] | null;
  homework_assigned: string;
  lesson_notes: string;
  teacher_feedback: string;
  student_performance?: string;
  new_mistakes_noticed?: string[] | null;
  vocabulary_to_review_next?: string[] | null;
  students?: { name: string; level: CefrLevel } | { name: string; level: CefrLevel }[] | null;
  materials?: { title: string } | { title: string }[] | null;
};

type MaterialRow = {
  id: string;
  student_id: string | null;
  students?: { name: string } | { name: string }[] | null;
  title: string;
  level: CefrLevel;
  skill: string;
  topic: string;
  exercise_type: string;
  summary: string;
  is_favorite?: boolean;
  content?: GeneratedMaterialContent | null;
  metadata?: MaterialMetadata | null;
  created_at: string;
};

type AiGenerationRow = {
  id: string;
  student_id: string;
  material_id: string | null;
  material_type: string;
  topic: string;
  level: CefrLevel;
  skill_focus: string;
  duration: string;
  generated_content?: GeneratedMaterialContent;
  output_content?: GeneratedMaterialContent;
  variation: number;
  created_at: string;
};

type WeeklyPreparationRow = {
  id: string;
  week_start: string;
  summary: string;
  suggestions: WeeklyPreparationSuggestion;
  status: WeeklyPreparationStatus;
  created_at: string;
};

export type StudentFormState = {
  ok?: boolean;
  error?: string;
};

export type StudentFormInput = {
  name: string;
  level: CefrLevel;
  nativeLanguage: string;
  goals: string[];
  interests: string[];
  lessonFrequency: string;
  notes: string;
  recurringMistakes: string[];
  grammarWeaknesses: string[];
  vocabularyToReview: string[];
  pronunciationNotes: string[];
  speakingConfidence: SpeakingConfidence;
  listeningWeaknesses: string[];
  preferredTopics: string[];
  avoidedTopics: string[];
  repeatedTopics: string[];
  strengths: string[];
  notesForNextClass: string;
  nextSuggestedFocus: string;
};

export type SaveMaterialInput = {
  studentId: string;
  materialType: MaterialType;
  topic: string;
  level: CefrLevel;
  skillFocus: string;
  content: GeneratedMaterialContent;
};

export type CreateAiGenerationInput = {
  studentId: string;
  materialId?: string | null;
  materialType: MaterialType;
  topic: string;
  level: CefrLevel;
  skillFocus: string;
  duration: string;
  inputContext: Record<string, unknown>;
  outputContent: GeneratedMaterialContent;
  variation: number;
  status: "completed" | "failed";
};

export type LessonPlanInput = {
  studentId: string;
  materialId: string | null;
  date: string;
  durationMinutes: number;
  lessonGoal: string;
  topic: string;
  skillFocus: string;
  teacherNotes: string;
  status: LessonStatus;
  lessonStructure: LessonStructure;
};

export type CompleteLessonInput = {
  lessonNotes: string;
  studentPerformance: string;
  newMistakesNoticed: string[];
  vocabularyToReviewNext: string[];
  strengths: string[];
  notesForNextClass: string;
  speakingConfidence: SpeakingConfidence;
  listeningWeaknesses: string[];
  homeworkAssigned: string;
};

export async function listStudents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,user_id,name,level,native_language,goals,interests,lesson_frequency,notes,last_lesson_at,created_at,updated_at,
      student_memory:student_memory!student_memory_student_id_fkey(id,user_id,student_id,recurring_mistakes,grammar_weaknesses,vocabulary_to_review,pronunciation_notes,speaking_confidence,listening_weaknesses,preferred_topics,avoided_topics,repeated_topics,strengths,notes_for_next_class,next_suggested_focus),
      lessons(id,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,topics_covered,homework_assigned,lesson_notes,teacher_feedback,student_performance,new_mistakes_noticed,vocabulary_to_review_next),
      materials(id,student_id,title,level,skill,topic,exercise_type,summary,is_favorite,created_at)
    `
    )
    .order("updated_at", { ascending: false });

  if (error) return { students: [], error: error.message };
  return { students: ((data || []) as StudentRow[]).map(mapStudent), error: null };
}

export async function getStudentProfile(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,user_id,name,level,native_language,goals,interests,lesson_frequency,notes,last_lesson_at,created_at,updated_at,
      student_memory:student_memory!student_memory_student_id_fkey(id,user_id,student_id,recurring_mistakes,grammar_weaknesses,vocabulary_to_review,pronunciation_notes,speaking_confidence,listening_weaknesses,preferred_topics,avoided_topics,repeated_topics,strengths,notes_for_next_class,next_suggested_focus),
      lessons(id,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,topics_covered,homework_assigned,lesson_notes,teacher_feedback,student_performance,new_mistakes_noticed,vocabulary_to_review_next),
      materials(id,student_id,title,level,skill,topic,exercise_type,summary,is_favorite,content,created_at)
    `
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error) return { student: null, materials: [], error: error.message };
  if (!data) return { student: null, materials: [], error: null };

  const student = mapStudent(data as StudentRow);
  const materials = mapMaterials((data as StudentRow).materials || [], student.name);
  return { student, materials, error: null };
}

export async function listMaterials() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id,student_id,title,level,skill,topic,exercise_type,summary,is_favorite,content,metadata,created_at,students(name)")
    .order("created_at", { ascending: false });

  if (error && isMissingMetadataColumnError(error)) {
    const fallback = await supabase
      .from("materials")
      .select("id,student_id,title,level,skill,topic,exercise_type,summary,is_favorite,content,created_at,students(name)")
      .order("created_at", { ascending: false });
    if (fallback.error) return { materials: [], error: fallback.error.message };
    return {
      materials: ((fallback.data || []) as unknown as MaterialRow[]).map(mapMaterialRow),
      error: null
    };
  }

  if (error) return { materials: [], error: error.message };

  return {
    materials: ((data || []) as unknown as MaterialRow[]).map(mapMaterialRow),
    error: null
  };
}

export async function listAiGenerations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("id,student_id,material_id,material_type,topic,level,skill_focus,duration,generated_content,output_content,variation,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return { generations: [], error: error.message };
  return {
    generations: ((data || []) as AiGenerationRow[]).map(mapAiGeneration),
    error: null
  };
}

export async function listLessonPlans() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();
  if (!authUser) return { lessons: [], error: "No authenticated user found for lessons." };

  if (process.env.NODE_ENV === "development") {
    console.info("[lessons.list] fetch context", {
      auth_user_id: authUser?.id || null,
      filter: authUser?.id ? "user_id = auth.uid()" : "RLS only"
    });
  }

  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id,created_at,updated_at,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,topics_covered,homework_assigned,lesson_notes,teacher_feedback,student_performance,new_mistakes_noticed,vocabulary_to_review_next,students(name,level),materials(title)"
    )
    .eq("user_id", authUser.id)
    .order("lesson_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { lessons: [], error: error.message };
  let mappedLessons = ((data || []) as unknown as LessonRow[]).map(mapLessonPlan);

  if (mappedLessons.length === 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: adminData, error: adminError } = await adminClient
      .from("lessons")
      .select(
        "id,created_at,updated_at,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,topics_covered,homework_assigned,lesson_notes,teacher_feedback,student_performance,new_mistakes_noticed,vocabulary_to_review_next,students(name,level),materials(title)"
      )
      .eq("user_id", authUser.id)
      .order("lesson_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (adminError && process.env.NODE_ENV === "development") {
      console.error("[lessons.list] service fallback query error", {
        message: adminError.message,
        code: adminError.code,
        details: adminError.details,
        hint: adminError.hint
      });
    }

    if (!adminError && adminData?.length) {
      mappedLessons = (adminData as unknown as LessonRow[]).map(mapLessonPlan);
      if (process.env.NODE_ENV === "development") {
        console.warn("[lessons.list] RLS select fallback used via service role", {
          count: mappedLessons.length,
          auth_user_id: authUser.id
        });
      }
    }
  } else if (mappedLessons.length === 0 && process.env.NODE_ENV === "development") {
    console.warn("[lessons.list] zero lessons and no service-role fallback available", {
      has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      auth_user_id: authUser.id
    });
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[lessons.list] fetched lessons", {
      count: mappedLessons.length,
      first_lesson: mappedLessons[0]
        ? {
            id: mappedLessons[0].id,
            rawDate: mappedLessons[0].rawDate,
            status: mappedLessons[0].status
          }
        : null
    });
  }
  return { lessons: mappedLessons, error: null };
}

export async function listWeeklyPreparations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_preparations")
    .select("id,week_start,summary,suggestions,status,created_at")
    .order("week_start", { ascending: false })
    .limit(8);

  if (error) return { preparations: [], error: error.message };
  return { preparations: ((data || []) as WeeklyPreparationRow[]).map(mapWeeklyPreparation), error: null };
}

export async function saveWeeklyPreparation(
  userId: string,
  input: {
    weekStart: string;
    summary: string;
    suggestions: WeeklyPreparationSuggestion;
    status?: WeeklyPreparationStatus;
  }
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("weekly_preparations")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", input.weekStart)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("weekly_preparations")
      .update({
        summary: input.summary,
        suggestions: input.suggestions,
        status: input.status || "draft"
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("weekly_preparations")
    .insert({
      user_id: userId,
      week_start: input.weekStart,
      summary: input.summary,
      suggestions: input.suggestions,
      status: input.status || "draft"
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function markWeeklyPreparationPrepared(userId: string, preparationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_preparations")
    .update({ status: "prepared" })
    .eq("id", preparationId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function assignMaterialToLesson(userId: string, lessonId: string, materialId: string) {
  const supabase = await createClient();
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("material_id,lesson_structure")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!lesson) throw new Error("Lesson not found.");
  const nextStructure = withAttachedMaterialId(
    (lesson.lesson_structure || defaultLessonStructure("", "")) as LessonStructure,
    materialId
  );
  const { error } = await supabase
    .from("lessons")
    .update({ material_id: lesson.material_id || materialId, lesson_structure: nextStructure })
    .eq("id", lessonId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function detachMaterialFromLesson(userId: string, lessonId: string, materialId: string) {
  const supabase = await createClient();
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("material_id,lesson_structure")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!lesson) throw new Error("Lesson not found.");
  const nextStructure = withoutAttachedMaterialId(
    (lesson.lesson_structure || defaultLessonStructure("", "")) as LessonStructure,
    materialId
  );
  const nextPrimaryMaterialId = lesson.material_id === materialId ? nextStructure.attachedMaterialIds?.[0] || null : lesson.material_id;
  const { error } = await supabase
    .from("lessons")
    .update({ material_id: nextPrimaryMaterialId, lesson_structure: nextStructure })
    .eq("id", lessonId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createLessonPlan(userId: string, input: LessonPlanInput) {
  return createLessonPlanWithClient(await createClient(), userId, input);
}

export async function createLessonPlanWithClient(
  supabase: SupabaseClient,
  userId: string,
  input: LessonPlanInput
) {
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("Lesson insert blocked: Supabase client has no authenticated user.");
  }
  if (authUser.id !== userId) {
    throw new Error("Lesson insert blocked: authenticated user does not match requested user_id.");
  }

  const { data: ownedStudent, error: studentOwnershipError } = await supabase
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (studentOwnershipError) throw new Error(studentOwnershipError.message);
  if (!ownedStudent) throw new Error("Selected student does not belong to the authenticated user.");

  if (input.materialId) {
    const { data: ownedMaterial, error: materialOwnershipError } = await supabase
      .from("materials")
      .select("id")
      .eq("id", input.materialId)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (materialOwnershipError) throw new Error(materialOwnershipError.message);
    if (!ownedMaterial) throw new Error("Selected material does not belong to the authenticated user.");
  }

  const payload = {
    user_id: authUser.id,
    student_id: input.studentId,
    material_id: input.materialId || null,
    lesson_date: input.date,
    duration_minutes: input.durationMinutes,
    status: input.status || "planned",
    title: input.lessonGoal || `${input.topic} lesson`,
    topic: input.topic,
    skill_focus: input.skillFocus,
    lesson_goal: input.lessonGoal,
    lesson_structure: input.lessonStructure,
    lesson_notes: input.teacherNotes,
    topics_covered: [input.topic].filter(Boolean)
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[lessons.create] auth user id", authUser.id);
    console.info("[lessons.create] insert payload", {
      user_id: payload.user_id,
      student_id: payload.student_id,
      material_id: payload.material_id,
      lesson_date: payload.lesson_date,
      status: payload.status
    });
  }

  const { data, error } = await supabase.from("lessons").insert(payload).select("id").single();
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[lessons.create] supabase error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    throw new Error(error.message);
  }
  if (process.env.NODE_ENV === "development") {
    console.info("[lessons.create] insert result", {
      lesson_id: data?.id || null
    });
  }
  return data?.id as string;
}

export async function updateLessonPlan(userId: string, lessonId: string, input: LessonPlanInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      student_id: input.studentId,
      material_id: input.materialId,
      lesson_date: input.date,
      duration_minutes: input.durationMinutes,
      status: input.status,
      title: input.lessonGoal || `${input.topic} lesson`,
      topic: input.topic,
      skill_focus: input.skillFocus,
      lesson_goal: input.lessonGoal,
      lesson_structure: input.lessonStructure,
      lesson_notes: input.teacherNotes,
      topics_covered: [input.topic].filter(Boolean)
    })
    .eq("id", lessonId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteLessonPlan(userId: string, lessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function completeLessonPlan(userId: string, lessonId: string, input: CompleteLessonInput) {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("student_id")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .single();

  const { error } = await supabase
    .from("lessons")
    .update({
      status: "completed",
      lesson_notes: input.lessonNotes,
      student_performance: input.studentPerformance,
      new_mistakes_noticed: input.newMistakesNoticed,
      vocabulary_to_review_next: input.vocabularyToReviewNext,
      homework_assigned: input.homeworkAssigned
    })
    .eq("id", lessonId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  if (lesson?.student_id) {
    await mergeCompletedLessonMemory(supabase, userId, lesson.student_id, input);
  }
}

export async function saveGeneratedMaterial(userId: string, input: SaveMaterialInput) {
  return saveGeneratedMaterialWithClient(await createClient(), userId, input);
}

export async function saveGeneratedMaterialWithClient(
  supabase: SupabaseClient,
  userId: string,
  input: SaveMaterialInput
) {
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development") {
    console.info("[materials.save] auth user id", authUser?.id || null);
  }

  if (authError || !authUser) {
    throw new Error("No authenticated Supabase user found while saving material.");
  }

  if (authUser.id !== userId) {
    throw new Error("Authenticated user does not match requested material owner.");
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Missing Supabase access token for material save.");
  }

  const tokenSub = decodeJwtSub(session.access_token);

  const authedDbClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    }
  );

  const { data: ownedStudent, error: studentOwnershipError } = await authedDbClient
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (studentOwnershipError) {
    throw new Error(studentOwnershipError.message);
  }
  if (!ownedStudent) {
    throw new Error("Selected student does not belong to the authenticated user.");
  }

  const payload = {
    user_id: authUser.id,
    student_id: input.studentId,
    title: input.content.title,
    level: input.level,
    skill: input.skillFocus,
    topic: input.topic,
    exercise_type: input.materialType,
    summary: input.content.objective,
    content: input.content,
    metadata: extractMaterialMetadata({
      title: input.content.title,
      topic: input.topic,
      level: input.level,
      materialType: input.materialType,
      skillFocus: input.skillFocus,
      content: input.content
    })
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[materials.save] insert payload", {
      user_id: payload.user_id,
      student_id: payload.student_id,
      level: payload.level,
      topic: payload.topic,
      skill: payload.skill,
      exercise_type: payload.exercise_type
    });
    console.info("[materials.save] session continuity", {
      expected_user_id: userId,
      auth_user_id: authUser.id,
      token_sub: tokenSub,
      has_access_token: Boolean(session.access_token)
    });
  }

  const { data, error } = await authedDbClient
    .from("materials")
    .insert(payload)
    .select("id")
    .single();

  if (error && isMissingMetadataColumnError(error)) {
    const { metadata: _metadata, ...fallbackPayload } = payload;
    const fallback = await authedDbClient.from("materials").insert(fallbackPayload).select("id").single();
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data.id as string;
  }

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[materials.save] supabase error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    throw new Error(error.message);
  }
  return data.id as string;
}

function decodeJwtSub(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json) as { sub?: string };
    return parsed.sub || null;
  } catch {
    return null;
  }
}

export async function createAiGeneration(userId: string, input: CreateAiGenerationInput) {
  const supabase = await createClient();
  const preferredInsert = {
    user_id: userId,
    student_id: input.studentId,
    material_id: input.materialId || null,
    material_type: input.materialType,
    topic: input.topic,
    level: input.level,
    skill_focus: input.skillFocus,
    duration: input.duration,
    input_context: input.inputContext,
    output_content: input.outputContent,
    variation: input.variation,
    status: input.status
  };

  const { data: preferredData, error: preferredError } = await supabase
    .from("ai_generations")
    .insert(preferredInsert)
    .select("id")
    .single();

  if (!preferredError) return preferredData.id as string;

  const legacyInsert = {
    user_id: userId,
    student_id: input.studentId,
    material_id: input.materialId || null,
    material_type: input.materialType,
    topic: input.topic,
    level: input.level,
    skill_focus: input.skillFocus,
    duration: input.duration,
    prompt_context: input.inputContext,
    generated_content: input.outputContent,
    variation: input.variation
  };

  const { data: legacyData, error: legacyError } = await supabase
    .from("ai_generations")
    .insert(legacyInsert)
    .select("id")
    .single();

  if (legacyError) throw new Error(legacyError.message);
  return legacyData.id as string;
}

export async function linkGenerationToMaterial(userId: string, generationId: string, materialId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_generations")
    .update({ material_id: materialId })
    .eq("id", generationId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function duplicateMaterial(userId: string, materialId: string) {
  const supabase = await createClient();
  const { data: material, error: readError } = await supabase
    .from("materials")
    .select("student_id,title,level,skill,topic,exercise_type,summary,content,is_favorite,metadata")
    .eq("id", materialId)
    .eq("user_id", userId)
    .single();

  let materialData: {
    student_id: string | null;
    title: string;
    level: CefrLevel;
    skill: string;
    topic: string;
    exercise_type: string;
    summary: string;
    content: GeneratedMaterialContent | null;
    is_favorite: boolean | null;
    metadata?: MaterialMetadata | null;
  } | null = material;
  if (readError && isMissingMetadataColumnError(readError)) {
    const fallback = await supabase
      .from("materials")
      .select("student_id,title,level,skill,topic,exercise_type,summary,content,is_favorite")
      .eq("id", materialId)
      .eq("user_id", userId)
      .single();
    if (fallback.error) throw new Error(fallback.error.message);
    materialData = fallback.data;
  } else if (readError) {
    throw new Error(readError.message);
  }

  if (!materialData) throw new Error("Material not found.");
  const metadata =
    materialData.metadata ||
    extractMaterialMetadata({
      title: materialData.title,
      topic: materialData.topic,
      level: materialData.level,
      materialType: materialData.exercise_type,
      skillFocus: materialData.skill,
      content: materialData.content as GeneratedMaterialContent | undefined
    });
  const insertPayload = {
    user_id: userId,
    student_id: materialData.student_id,
    title: `${materialData.title} (copy)`,
    level: materialData.level,
    skill: materialData.skill,
    topic: materialData.topic,
    exercise_type: materialData.exercise_type,
    summary: materialData.summary,
    content: materialData.content,
    is_favorite: Boolean(materialData.is_favorite),
    metadata
  };

  const { data, error } = await supabase
    .from("materials")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error && isMissingMetadataColumnError(error)) {
    const { metadata: _metadata, ...fallbackPayload } = insertPayload;
    const fallback = await supabase.from("materials").insert(fallbackPayload).select("id").single();
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data.id as string;
  }
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function setMaterialFavorite(userId: string, materialId: string, isFavorite: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({ is_favorite: isFavorite })
    .eq("id", materialId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export type UpdateMaterialInput = {
  title: string;
  topic: string;
  summary: string;
  level: string;
  skill: string;
  exerciseType: string;
};

export async function updateMaterial(userId: string, materialId: string, input: UpdateMaterialInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({
      title: input.title,
      topic: input.topic,
      summary: input.summary,
      level: input.level,
      skill: input.skill,
      exercise_type: input.exerciseType
    })
    .eq("id", materialId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function updateMaterialContent(userId: string, materialId: string, content: unknown) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .update({ content })
    .eq("id", materialId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteMaterial(userId: string, materialId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().eq("id", materialId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteMaterialsBulk(userId: string, materialIds: string[]) {
  if (materialIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().in("id", materialIds).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createStudentRecord(userId: string, input: StudentFormInput) {
  return createStudentRecordWithClient(await createClient(), userId, input);
}

export async function createStudentRecordWithClient(
  supabase: SupabaseClient,
  userId: string,
  input: StudentFormInput
) {
  const {
    data: { user: insertUser },
    error: insertUserError
  } = await supabase.auth.getUser();

  if (insertUserError || !insertUser) {
    throw new Error("Student insert blocked: Supabase client has no authenticated user.");
  }
  if (insertUser.id !== userId) {
    throw new Error("Student insert blocked: authenticated user does not match requested user_id.");
  }

  const { data, error } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      name: input.name,
      level: input.level,
      native_language: input.nativeLanguage,
      goals: input.goals,
      interests: input.interests,
      lesson_frequency: input.lessonFrequency,
      notes: input.notes
    })
    .select("id")
    .single();

  if (error) throw new Error(`students insert failed: ${error.message}`);

  try {
    await insertStudentMemory(supabase, userId, data.id, input);
  } catch (error) {
    throw error;
  }
  return data.id as string;
}

export async function updateStudentRecord(userId: string, studentId: string, input: StudentFormInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name: input.name,
      level: input.level,
      native_language: input.nativeLanguage,
      goals: input.goals,
      interests: input.interests,
      lesson_frequency: input.lessonFrequency,
      notes: input.notes
    })
    .eq("id", studentId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  await upsertStudentMemory(supabase, userId, studentId, input);
}

export async function deleteStudentRecord(userId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function seedSampleStudents(userId: string) {
  if (!isDevSeedEnabled()) {
    throw new Error("Sample data seeding is only available in local development.");
  }

  const existing = await listStudents();
  if (existing.students.length > 0) return;

  const mariaId = await createStudentRecord(userId, {
    name: "Maria Gomez",
    level: "B1",
    nativeLanguage: "Spanish",
    goals: ["Speak more confidently in client meetings", "Use past tenses accurately"],
    interests: ["travel", "work culture", "food"],
    lessonFrequency: "2 lessons / week",
    notes: "Enjoys role-play and practical meeting language. Needs time to prepare before open discussion.",
    recurringMistakes: ["Forgets third-person -s", "Overuses present simple for past events"],
    grammarWeaknesses: ["Present perfect", "Question formation"],
    vocabularyToReview: ["deadline", "briefing", "delayed", "arrange"],
    pronunciationNotes: ["Final consonants in past tense endings"],
    speakingConfidence: "Developing",
    listeningWeaknesses: ["Fast connected speech in meetings"],
    preferredTopics: ["work culture", "travel"],
    avoidedTopics: ["restaurant reviews"],
    repeatedTopics: ["travel problems"],
    strengths: ["Practical vocabulary recall"],
    notesForNextClass: "Use workplace role-play and keep correction focused.",
    nextSuggestedFocus: "Past simple vs. present perfect in work updates"
  });

  const kenjiId = await createStudentRecord(userId, {
    name: "Kenji Sato",
    level: "B2",
    nativeLanguage: "Japanese",
    goals: ["Lead technical demos", "Sound more natural in Q&A"],
    interests: ["technology", "product design", "startups"],
    lessonFrequency: "1 lesson / week",
    notes: "Strong vocabulary but answers can be too brief. Benefits from timed speaking tasks.",
    recurringMistakes: ["Uses very formal connectors in casual speech", "Avoids follow-up questions"],
    grammarWeaknesses: ["Conditionals for product scenarios", "Natural phrasal verbs"],
    vocabularyToReview: ["walkthrough", "trade-off", "edge case", "rollout"],
    pronunciationNotes: ["Sentence stress in contrastive explanations"],
    speakingConfidence: "Confident",
    listeningWeaknesses: ["Interruptions during Q&A"],
    preferredTopics: ["technology", "product design"],
    avoidedTopics: ["generic small talk"],
    repeatedTopics: ["startup pitch"],
    strengths: ["Clear technical explanations"],
    notesForNextClass: "Push for fuller answers and follow-up questions.",
    nextSuggestedFocus: "Handling interruptions during a demo"
  });

  const supabase = await createClient();
  await supabase.from("lessons").insert([
    {
      user_id: userId,
      student_id: mariaId,
      lesson_date: "2026-05-19",
      title: "Project updates",
      skill_focus: "Past tenses and meeting phrases",
      topics_covered: ["status updates", "project delays"],
      homework_assigned: "Write a five-sentence update about a delayed project.",
      lesson_notes: "Maria self-corrected several past tense errors after prompting.",
      teacher_feedback: "Good range of work vocabulary; keep drilling present perfect."
    },
    {
      user_id: userId,
      student_id: kenjiId,
      lesson_date: "2026-05-20",
      title: "Product demo Q&A",
      skill_focus: "Clarifying and expanding answers",
      topics_covered: ["feature walkthrough", "customer objections"],
      homework_assigned: "Prepare three longer answers to common demo questions.",
      lesson_notes: "Answered accurately but sometimes stopped after one sentence.",
      teacher_feedback: "Push for more examples and invite the listener back into the conversation."
    }
  ]);

  await supabase.from("materials").insert([
    {
      user_id: userId,
      student_id: mariaId,
      title: "Client meeting role-play pack",
      level: "B1",
      skill: "Speaking",
      topic: "work culture",
      exercise_type: "Role-play",
      summary: "Meeting warm-up, useful phrases, two client scenarios, and correction prompts."
    },
    {
      user_id: userId,
      student_id: kenjiId,
      title: "Technical demo Q&A drills",
      level: "B2",
      skill: "Speaking",
      topic: "technology",
      exercise_type: "Fluency drill",
      summary: "Timed answers, interruption phrases, and follow-up question practice."
    }
  ]);
}

export async function createDemoWorkspace(userId: string) {
  const supabase = await createClient();
  const { students } = await listStudents();
  if (students.length > 0) {
    return { created: false, reason: "workspace_not_empty" as const };
  }

  const sarahId = await createStudentRecord(userId, {
    name: "Sarah",
    level: "B1",
    nativeLanguage: "Portuguese",
    goals: ["Improve fluency in casual conversation", "Use richer topic vocabulary"],
    interests: ["technology", "travel", "wellness"],
    lessonFrequency: "1 lesson / week",
    notes: "Learns best with natural discussions and concise corrections.",
    recurringMistakes: ["Answers are too short", "Missing verb endings in past tense"],
    grammarWeaknesses: ["Past simple consistency", "Question word order"],
    vocabularyToReview: ["doomscrolling", "attention span", "digital detox", "notifications"],
    pronunciationNotes: ["Drops word endings under pressure"],
    speakingConfidence: "Developing",
    listeningWeaknesses: ["Fast informal speech in podcasts"],
    preferredTopics: ["Technology Addiction", "Remote Work"],
    avoidedTopics: ["Celebrity gossip"],
    repeatedTopics: ["Travel"],
    strengths: ["Asks follow-up questions confidently"],
    notesForNextClass: "Push for deeper opinions and short storytelling.",
    nextSuggestedFocus: "Expand opinions with supporting examples"
  });

  const marcoId = await createStudentRecord(userId, {
    name: "Marco",
    level: "B2",
    nativeLanguage: "Italian",
    goals: ["Lead interviews in English", "Speak more clearly in team meetings"],
    interests: ["hiring", "leadership", "startups"],
    lessonFrequency: "2 lessons / week",
    notes: "Prefers practical business communication with role-based situations.",
    recurringMistakes: ["Too direct wording in feedback", "Article mistakes in formal speech"],
    grammarWeaknesses: ["Conditionals in negotiations", "Article use in business terms"],
    vocabularyToReview: ["candidate pipeline", "shortlist", "onboarding", "stakeholder"],
    pronunciationNotes: ["Stress in multi-syllable business terms"],
    speakingConfidence: "Confident",
    listeningWeaknesses: ["Fast group discussion with overlapping voices"],
    preferredTopics: ["Hiring Process", "AI at Work"],
    avoidedTopics: ["Small talk-heavy topics"],
    repeatedTopics: ["Project management"],
    strengths: ["Strong structure in presentations"],
    notesForNextClass: "Practice diplomacy and softer disagreement language.",
    nextSuggestedFocus: "Polite disagreement and interview follow-ups"
  });

  const andreaId = await createStudentRecord(userId, {
    name: "Andrea",
    level: "C1",
    nativeLanguage: "Spanish",
    goals: ["Strengthen professional communication", "Improve precision in high-stakes conversations"],
    interests: ["strategy", "communication", "future of work"],
    lessonFrequency: "1 lesson / week",
    notes: "Enjoys advanced discussion with nuanced argumentation.",
    recurringMistakes: ["Occasional false friends in formal contexts", "Overly long sentence chains"],
    grammarWeaknesses: ["Punctuation pauses while speaking", "Nominalization overuse"],
    vocabularyToReview: ["trade-off", "alignment", "implementation gap", "accountability"],
    pronunciationNotes: ["Flattened intonation in long explanations"],
    speakingConfidence: "Advanced",
    listeningWeaknesses: ["Accent variety in multinational calls"],
    preferredTopics: ["Remote Work", "AI at Work"],
    avoidedTopics: ["Basic lifestyle topics"],
    repeatedTopics: ["General productivity"],
    strengths: ["Clear argument structure"],
    notesForNextClass: "Challenge with concise executive summaries.",
    nextSuggestedFocus: "Concise high-impact professional messaging"
  });

  const speakingContent = {
    title: "Technology Addiction · Speaking Questions",
    objective: "Develop longer opinions and follow-up answers.",
    vocabulary: [],
    studentSheet: {
      topic: "Technology Addiction",
      vocabulary: [],
      usefulPhrases: [],
      speakingQuestions: [],
      easierQuestions: [
        "How has your screen time changed over the last few years?",
        "Which app is hardest for you to stop using and why?"
      ],
      mainDiscussionQuestions: [
        "Do you think technology improves relationships or weakens them?",
        "Who should take more responsibility for digital addiction: users or companies?"
      ],
      deeperDiscussionQuestions: [
        "Should schools and workplaces actively teach digital boundaries?"
      ]
    }
  } satisfies GeneratedMaterialContent;

  const vocabularyContent = {
    title: "Hiring Process · Vocabulary Sheet",
    objective: "Practice practical hiring and interview language for real business contexts.",
    vocabulary: [],
    studentSheet: {
      topic: "Hiring Process",
      vocabulary: [
        "shortlist -> final candidates selected for deeper evaluation",
        "candidate pipeline -> sequence of candidates across hiring stages",
        "cultural fit -> how well someone matches team values",
        "onboarding -> process of integrating a new hire into the company"
      ],
      usefulPhrases: [
        "Let's align on the role requirements first.",
        "We need to balance speed and quality in hiring.",
        "How should we evaluate communication under pressure?"
      ],
      speakingQuestions: []
    }
  } satisfies GeneratedMaterialContent;

  const quizContent = {
    title: "Remote Work · Quiz",
    objective: "Review vocabulary and practical communication from recent remote-work lessons.",
    vocabulary: [],
    studentSheet: {
      topic: "Remote Work",
      vocabulary: [],
      usefulPhrases: [],
      speakingQuestions: [],
      quizSections: [
        {
          title: "✅ Quick Check",
          items: [
            "Which phrase is best for clarifying expectations in a remote team?",
            "Choose the most natural follow-up after a delayed response."
          ]
        },
        {
          title: "✍️ Complete the Sentence",
          items: [
            "Before we finalize, let's ___ on priorities for this sprint.",
            "I suggest we set a clear ___ for feedback."
          ]
        }
      ]
    }
  } satisfies GeneratedMaterialContent;

  const roleplayContent = {
    title: "AI at Work · Roleplay",
    objective: "Practice realistic roleplay scenarios around AI adoption in professional teams.",
    vocabulary: [],
    studentSheet: {
      topic: "AI at Work",
      vocabulary: [],
      usefulPhrases: [],
      speakingQuestions: [],
      roleplayScenarios: [
        {
          title: "Policy Discussion",
          situation: "You are discussing whether AI-generated content should be reviewed before client delivery.",
          discuss: [
            "What risks are acceptable?",
            "Who owns final responsibility for quality?",
            "How would you communicate this policy to the team?"
          ]
        }
      ]
    }
  } satisfies GeneratedMaterialContent;

  const { data: materialRows, error: materialError } = await supabase
    .from("materials")
    .insert([
      {
        user_id: userId,
        student_id: sarahId,
        title: speakingContent.title,
        level: "B1",
        skill: "Speaking",
        topic: "Technology Addiction",
        exercise_type: "Speaking questions",
        summary: speakingContent.objective,
        content: speakingContent
      },
      {
        user_id: userId,
        student_id: marcoId,
        title: vocabularyContent.title,
        level: "B2",
        skill: "Vocabulary",
        topic: "Hiring Process",
        exercise_type: "Vocabulary sheet",
        summary: vocabularyContent.objective,
        content: vocabularyContent
      },
      {
        user_id: userId,
        student_id: andreaId,
        title: quizContent.title,
        level: "C1",
        skill: "Review",
        topic: "Remote Work",
        exercise_type: "Quiz",
        summary: quizContent.objective,
        content: quizContent
      },
      {
        user_id: userId,
        student_id: andreaId,
        title: roleplayContent.title,
        level: "C1",
        skill: "Speaking",
        topic: "AI at Work",
        exercise_type: "Roleplay",
        summary: roleplayContent.objective,
        content: roleplayContent
      }
    ])
    .select("id,student_id,title");

  if (materialError) throw new Error(materialError.message);
  const speakingMaterialId = materialRows?.find((row) => row.title.includes("Speaking Questions"))?.id || null;
  const vocabMaterialId = materialRows?.find((row) => row.title.includes("Vocabulary Sheet"))?.id || null;
  const quizMaterialId = materialRows?.find((row) => row.title.includes("Quiz"))?.id || null;
  const roleplayMaterialId = materialRows?.find((row) => row.title.includes("Roleplay"))?.id || null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const inThreeDays = new Date(now);
  inThreeDays.setDate(now.getDate() + 3);
  const inFiveDays = new Date(now);
  inFiveDays.setDate(now.getDate() + 5);

  const { error: lessonError } = await supabase.from("lessons").insert([
    {
      user_id: userId,
      student_id: sarahId,
      material_id: speakingMaterialId,
      lesson_date: tomorrow.toISOString().slice(0, 10),
      status: "planned",
      title: "Technology Addiction discussion",
      topic: "Technology Addiction",
      skill_focus: "Speaking",
      lesson_goal: "Expand opinions with examples and follow-up questions",
      lesson_structure: defaultLessonStructure("Technology Addiction", "Speaking"),
      lesson_notes: "Plan to review short-answer habits before free discussion.",
      topics_covered: ["technology habits"],
      homework_assigned: "Write three examples of digital habits you want to change."
    },
    {
      user_id: userId,
      student_id: marcoId,
      material_id: vocabMaterialId,
      lesson_date: inThreeDays.toISOString().slice(0, 10),
      status: "planned",
      title: "Hiring Process vocabulary activation",
      topic: "Hiring Process",
      skill_focus: "Business English",
      lesson_goal: "Use hiring vocabulary naturally in decision-making scenarios",
      lesson_structure: defaultLessonStructure("Hiring Process", "Business English"),
      lesson_notes: "Focus on polite disagreement and stakeholder language.",
      topics_covered: ["hiring", "interview stages"]
    },
    {
      user_id: userId,
      student_id: andreaId,
      material_id: roleplayMaterialId,
      lesson_date: inFiveDays.toISOString().slice(0, 10),
      status: "planned",
      title: "AI at Work roleplay practice",
      topic: "AI at Work",
      skill_focus: "Professional Communication",
      lesson_goal: "Practice concise executive communication in AI policy scenarios",
      lesson_structure: defaultLessonStructure("AI at Work", "Professional Communication"),
      lesson_notes: "Challenge with tighter summaries and clear recommendations."
    },
    {
      user_id: userId,
      student_id: marcoId,
      material_id: quizMaterialId,
      lesson_date: yesterday.toISOString().slice(0, 10),
      status: "completed",
      title: "Remote Work review quiz",
      topic: "Remote Work",
      skill_focus: "Review",
      lesson_goal: "Consolidate remote-work communication language",
      lesson_structure: defaultLessonStructure("Remote Work", "Review"),
      lesson_notes: "Marco improved clarity when summarizing team decisions.",
      student_performance: "Confident with key terms; still hesitates with softer disagreement.",
      new_mistakes_noticed: ["Overuses direct imperatives in feedback"],
      vocabulary_to_review_next: ["asynchronous", "handover", "alignment"],
      homework_assigned: "Record a 2-minute update using three target terms.",
      teacher_feedback: "Great progress; continue balancing clarity with politeness.",
      topics_covered: ["remote collaboration", "team communication"]
    },
    {
      user_id: userId,
      student_id: sarahId,
      material_id: speakingMaterialId,
      lesson_date: twoDaysAgo.toISOString().slice(0, 10),
      status: "completed",
      title: "Conversation fluency checkpoint",
      topic: "Technology Addiction",
      skill_focus: "Speaking",
      lesson_goal: "Build longer responses under time pressure",
      lesson_structure: defaultLessonStructure("Technology Addiction", "Speaking"),
      lesson_notes: "Sarah gave fuller answers when prompted for examples.",
      student_performance: "Growing confidence; needs more spontaneous follow-ups.",
      new_mistakes_noticed: ["Past tense endings dropped in fast speech"],
      vocabulary_to_review_next: ["attention span", "digital detox"],
      homework_assigned: "Prepare one short story about reducing screen time.",
      teacher_feedback: "Good momentum. Keep practicing detail-rich answers.",
      topics_covered: ["digital habits", "attention"]
    }
  ]);
  if (lessonError) throw new Error(lessonError.message);

  const weekStart = getCurrentWeekStart(now);
  const [{ students: refreshedStudents }, { lessons: refreshedLessons }, { materials: refreshedMaterials }] = await Promise.all([
    listStudents(),
    listLessonPlans(),
    listMaterials()
  ]);
  const suggestions = buildWeeklyPreparationSuggestions({
    weekStart,
    students: refreshedStudents,
    lessons: refreshedLessons,
    materials: refreshedMaterials
  });
  const summary = `${suggestions.priorityLessons.length} priorities, ${suggestions.reusableMaterials.length} reusable materials, ${suggestions.checklist.length} checklist lessons.`;
  await saveWeeklyPreparation(userId, { weekStart, summary, suggestions, status: "draft" });

  return { created: true as const, studentId: sarahId };
}

export function parseStudentFormData(formData: FormData): StudentFormInput {
  const level = String(formData.get("level") || "B1") as CefrLevel;
  return {
    name: requiredText(formData, "name"),
    level,
    nativeLanguage: text(formData, "nativeLanguage"),
    goals: list(formData, "goals"),
    interests: list(formData, "interests"),
    lessonFrequency: text(formData, "lessonFrequency"),
    notes: text(formData, "notes"),
    recurringMistakes: list(formData, "recurringMistakes"),
    grammarWeaknesses: list(formData, "grammarWeaknesses"),
    vocabularyToReview: list(formData, "vocabularyToReview"),
    pronunciationNotes: list(formData, "pronunciationNotes"),
    speakingConfidence: String(formData.get("speakingConfidence") || "Developing") as SpeakingConfidence,
    listeningWeaknesses: list(formData, "listeningWeaknesses"),
    preferredTopics: list(formData, "preferredTopics"),
    avoidedTopics: list(formData, "avoidedTopics"),
    repeatedTopics: list(formData, "repeatedTopics"),
    strengths: list(formData, "strengths"),
    notesForNextClass: text(formData, "notesForNextClass"),
    nextSuggestedFocus: text(formData, "nextSuggestedFocus")
  };
}

export function parseLessonPlanFormData(formData: FormData): LessonPlanInput {
  return {
    studentId: requiredText(formData, "studentId"),
    materialId: text(formData, "materialId") || null,
    date: requiredText(formData, "date"),
    durationMinutes: Number(formData.get("durationMinutes") || 45),
    lessonGoal: text(formData, "lessonGoal"),
    topic: text(formData, "topic"),
    skillFocus: text(formData, "skillFocus"),
    teacherNotes: text(formData, "teacherNotes"),
    status: (text(formData, "status") || "planned") as LessonStatus,
    lessonStructure: {
      warmUp: text(formData, "warmUp"),
      review: text(formData, "review"),
      mainSpeakingTask: text(formData, "mainSpeakingTask"),
      vocabularyActivation: text(formData, "vocabularyActivation"),
      listeningReadingActivity: text(formData, "listeningReadingActivity"),
      correctionAndFeedback: text(formData, "correctionAndFeedback"),
      homework: text(formData, "homework")
    }
  };
}

export function parseCompleteLessonFormData(formData: FormData): CompleteLessonInput {
  return {
    lessonNotes: text(formData, "lessonNotes"),
    studentPerformance: text(formData, "studentPerformance"),
    newMistakesNoticed: list(formData, "newMistakesNoticed"),
    vocabularyToReviewNext: list(formData, "vocabularyToReviewNext"),
    strengths: list(formData, "strengths"),
    notesForNextClass: text(formData, "notesForNextClass"),
    speakingConfidence: String(formData.get("speakingConfidence") || "Developing") as SpeakingConfidence,
    listeningWeaknesses: list(formData, "listeningWeaknesses"),
    homeworkAssigned: text(formData, "homeworkAssigned")
  };
}

export function buildAiSuggestions(student: TeachingStudent): AiSuggestions {
  const topic = student.nextSuggestedFocus || student.interests[0] || "a practical conversation";
  const vocab = student.vocabularyToReview.slice(0, 4);
  const grammar = student.grammarWeaknesses[0] || "accuracy in longer turns";

  return {
    suggestedNextLessonTopic: topic,
    vocabularyToRecycle: vocab.length > 0 ? vocab : ["clarify", "respond", "follow up"],
    suggestedSpeakingActivity: `Run a ${student.level} speaking task about ${topic.toLowerCase()} with correction pauses for ${grammar.toLowerCase()}.`,
    suggestedHomework: `Write or record a short response using ${vocab.slice(0, 3).join(", ") || "three target phrases"} and one self-correction note.`
  };
}

export function isDevSeedEnabled() {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEV_SEED === "true";
}

function mapStudent(row: StudentRow): TeachingStudent {
  const memory = Array.isArray(row.student_memory) ? row.student_memory[0] : row.student_memory;
  const lessons = [...(row.lessons || [])].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));
  const vocabularyToReview = memory?.vocabulary_to_review || [];
  const memoryItems = buildMemoryItems(memory);
  const student: TeachingStudent = {
    id: row.id,
    name: row.name,
    level: row.level,
    nativeLanguage: row.native_language || "",
    goals: row.goals || [],
    interests: row.interests || [],
    preferredTopics: memory?.preferred_topics?.length ? memory.preferred_topics : row.interests || [],
    lessonFrequency: row.lesson_frequency || "",
    lastLesson: row.last_lesson_at ? formatDate(row.last_lesson_at) : lessons[0] ? formatDate(lessons[0].lesson_date) : "No lessons yet",
    nextSuggestedFocus: memory?.next_suggested_focus || "Build confidence with a personalized speaking task",
    notes: row.notes || "",
    recurringMistakes: memory?.recurring_mistakes || [],
    grammarWeaknesses: memory?.grammar_weaknesses || [],
    vocabularyToReview,
    pronunciationNotes: memory?.pronunciation_notes || [],
    speakingConfidence: memory?.speaking_confidence || "Developing",
    listeningWeaknesses: memory?.listening_weaknesses || [],
    avoidedTopics: memory?.avoided_topics || [],
    repeatedTopics: memory?.repeated_topics || [],
    strengths: memory?.strengths || [],
    notesForNextClass: memory?.notes_for_next_class || "",
    memoryItems,
    memorySummary: {
      reviewNext: [],
      avoidRepeating: [],
      suggestedNextLessonFocus: "",
      vocabularyToRecycle: [],
      commonMistakes: []
    },
    lessonHistory: lessons.map((lesson) => ({
      id: lesson.id,
      rawDate: lesson.lesson_date,
      date: formatDate(lesson.lesson_date),
      title: lesson.title,
      focus: lesson.skill_focus || "",
      topic: lesson.topic || "",
      skillFocus: lesson.skill_focus || "",
      lessonGoal: lesson.lesson_goal || "",
      durationMinutes: lesson.duration_minutes || 45,
      status: lesson.status || "completed",
      materialId: lesson.material_id || null,
      lessonStructure: lesson.lesson_structure || undefined,
      topicsCovered: lesson.topics_covered || [],
      homeworkAssigned: lesson.homework_assigned,
      notes: lesson.lesson_notes,
      teacherFeedback: lesson.teacher_feedback,
      studentPerformance: lesson.student_performance || "",
      newMistakesNoticed: lesson.new_mistakes_noticed || [],
      vocabularyToReviewNext: lesson.vocabulary_to_review_next || []
    })),
    aiSuggestions: {
      suggestedNextLessonTopic: "",
      vocabularyToRecycle: [],
      suggestedSpeakingActivity: "",
      suggestedHomework: ""
    },
    generatedMaterialIds: (row.materials || []).map((material) => material.id)
  };

  student.aiSuggestions = buildAiSuggestions(student);
  student.memorySummary = buildMemorySummary(student);
  return student;
}

export function buildMemorySummary(student: TeachingStudent) {
  return {
    reviewNext: [
      ...student.vocabularyToReview.slice(0, 3),
      ...student.grammarWeaknesses.slice(0, 2)
    ].filter(Boolean),
    avoidRepeating: student.avoidedTopics.length ? student.avoidedTopics : student.repeatedTopics.slice(0, 3),
    suggestedNextLessonFocus: student.nextSuggestedFocus,
    vocabularyToRecycle: student.vocabularyToReview.slice(0, 5),
    commonMistakes: student.recurringMistakes.slice(0, 5)
  };
}

function mapLessonPlan(row: LessonRow): LessonPlanSummary {
  const student = getJoinedSingle(row.students);
  const material = getJoinedSingle(row.materials);
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    studentId: row.student_id || "",
    studentName: student?.name || "Unknown student",
    studentLevel: student?.level || "B1",
    materialId: row.material_id || null,
    materialTitle: material?.title || "",
    rawDate: row.lesson_date,
    date: formatDate(row.lesson_date),
    durationMinutes: row.duration_minutes || 45,
    status: row.status || "planned",
    title: row.title,
    focus: row.skill_focus || "",
    topic: row.topic || "",
    skillFocus: row.skill_focus || "",
    lessonGoal: row.lesson_goal || row.title,
    lessonStructure: row.lesson_structure || defaultLessonStructure(row.topic || row.title, row.skill_focus || "Speaking"),
    teacherNotes: row.lesson_notes || "",
    homeworkAssigned: row.homework_assigned || "",
    studentPerformance: row.student_performance || ""
  };
}

function mapWeeklyPreparation(row: WeeklyPreparationRow): WeeklyPreparation {
  return {
    id: row.id,
    weekStart: row.week_start,
    summary: row.summary,
    suggestions: row.suggestions,
    status: row.status,
    createdAt: formatDate(row.created_at)
  };
}

function mapAiGeneration(row: AiGenerationRow): AiGenerationHistoryItem {
  const content = row.output_content || row.generated_content;
  return {
    id: row.id,
    studentId: row.student_id,
    materialId: row.material_id,
    materialType: row.material_type,
    topic: row.topic,
    level: row.level,
    skillFocus: row.skill_focus,
    duration: row.duration,
    content: content as GeneratedMaterialContent,
    variation: row.variation,
    createdAt: formatDate(row.created_at)
  };
}

function mapMaterials(rows: MaterialRow[], studentName: string): TeachingMaterial[] {
  return [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => ({
      id: row.id,
      title: row.title,
      studentId: row.student_id,
      studentName,
      level: row.level,
      skill: row.skill,
      topic: row.topic,
      exerciseType: row.exercise_type,
      createdAt: formatDate(row.created_at),
      summary: row.summary,
      isFavorite: Boolean(row.is_favorite),
      content: row.content || undefined,
      metadata: row.metadata || buildFallbackMaterialMetadata(row)
    }));
}

function mapMaterialRow(row: MaterialRow): TeachingMaterial {
  return {
    id: row.id,
    title: row.title,
    studentId: row.student_id,
    studentName: getJoinedStudentName(row.students),
    level: row.level,
    skill: row.skill,
    topic: row.topic,
    exerciseType: row.exercise_type,
    createdAt: formatDate(row.created_at),
    summary: row.summary,
    isFavorite: Boolean(row.is_favorite),
    content: row.content || undefined,
    metadata: row.metadata || buildFallbackMaterialMetadata(row)
  };
}

function buildFallbackMaterialMetadata(row: MaterialRow) {
  return extractMaterialMetadata({
    title: row.title,
    topic: row.topic,
    level: row.level,
    materialType: row.exercise_type,
    skillFocus: row.skill,
    content: row.content || undefined
  });
}

function isMissingMetadataColumnError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message || "";
  return error?.code === "42703" || /metadata.*does not exist/i.test(message) || /Could not find.*metadata/i.test(message);
}

function getJoinedStudentName(value: MaterialRow["students"]) {
  if (Array.isArray(value)) return value[0]?.name || "Unassigned";
  return value?.name || "Unassigned";
}

function getJoinedSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

async function upsertStudentMemory(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  input: StudentFormInput
) {
  const { error } = await supabase.from("student_memory").upsert(
    {
      user_id: userId,
      student_id: studentId,
      recurring_mistakes: input.recurringMistakes,
      grammar_weaknesses: input.grammarWeaknesses,
      vocabulary_to_review: input.vocabularyToReview,
      pronunciation_notes: input.pronunciationNotes,
      speaking_confidence: input.speakingConfidence,
      listening_weaknesses: input.listeningWeaknesses,
      preferred_topics: input.preferredTopics,
      avoided_topics: input.avoidedTopics,
      repeated_topics: input.repeatedTopics,
      strengths: input.strengths,
      notes_for_next_class: input.notesForNextClass,
      next_suggested_focus: input.nextSuggestedFocus
    },
    { onConflict: "student_id" }
  );

  if (error) throw new Error(`student_memory upsert failed: ${error.message}`);
}

async function insertStudentMemory(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  input: StudentFormInput
) {
  const { error } = await supabase.from("student_memory").insert({
    user_id: userId,
    student_id: studentId,
    recurring_mistakes: input.recurringMistakes,
    grammar_weaknesses: input.grammarWeaknesses,
    vocabulary_to_review: input.vocabularyToReview,
    pronunciation_notes: input.pronunciationNotes,
    speaking_confidence: input.speakingConfidence,
    listening_weaknesses: input.listeningWeaknesses,
    preferred_topics: input.preferredTopics,
    avoided_topics: input.avoidedTopics,
    repeated_topics: input.repeatedTopics,
    strengths: input.strengths,
    notes_for_next_class: input.notesForNextClass,
    next_suggested_focus: input.nextSuggestedFocus
  });

  if (error) throw new Error(`student_memory insert failed: ${error.message}`);
}

async function mergeCompletedLessonMemory(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  input: CompleteLessonInput
) {
  const { data } = await supabase
    .from("student_memory")
    .select("recurring_mistakes,vocabulary_to_review,strengths,notes_for_next_class,listening_weaknesses")
    .eq("student_id", studentId)
    .eq("user_id", userId)
    .maybeSingle();

  const existing = (data || {}) as {
    recurring_mistakes?: string[];
    vocabulary_to_review?: string[];
    strengths?: string[];
    notes_for_next_class?: string;
    listening_weaknesses?: string[];
  };

  await supabase.from("student_memory").upsert(
    {
      user_id: userId,
      student_id: studentId,
      recurring_mistakes: unique([...(existing.recurring_mistakes || []), ...input.newMistakesNoticed]),
      vocabulary_to_review: unique([...(existing.vocabulary_to_review || []), ...input.vocabularyToReviewNext]),
      strengths: unique([...(existing.strengths || []), ...input.strengths]),
      notes_for_next_class: input.notesForNextClass || existing.notes_for_next_class || "",
      speaking_confidence: input.speakingConfidence,
      listening_weaknesses: unique([...(existing.listening_weaknesses || []), ...input.listeningWeaknesses])
    },
    { onConflict: "student_id" }
  );
}

function buildMemoryItems(memory?: StudentMemoryRow | null): TeachingMemoryItem[] {
  if (!memory) return [];

  const items: TeachingMemoryItem[] = [
    ...toMemoryItems("grammar", memory.grammar_weaknesses || []),
    ...toMemoryItems("vocabulary", memory.vocabulary_to_review || []),
    ...toMemoryItems("pronunciation", memory.pronunciation_notes || []),
    ...toMemoryItems("listening", memory.listening_weaknesses || []),
    ...toMemoryItems("topic", memory.preferred_topics || []),
    ...toMemoryItems("topic", memory.avoided_topics || []),
    ...toMemoryItems("confidence", memory.strengths || []),
    ...(memory.notes_for_next_class ? toMemoryItems("fluency", [memory.notes_for_next_class]) : [])
  ];

  return items.slice(0, 24);
}

function toMemoryItems(category: MemoryCategory, values: string[]): TeachingMemoryItem[] {
  return values.map((content, index) => ({
    id: `${category}-${index}-${content.slice(0, 24)}`,
    category,
    content,
    lessonId: null,
    createdAt: "Saved in profile"
  }));
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) throw new Error("Student name is required.");
  return value;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function list(formData: FormData, key: string) {
  const values = formData.getAll(key).map((value) => String(value || "").trim()).filter(Boolean);
  const raw = values.length > 0 ? values.join("\n") : text(formData, key);
  return raw
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
