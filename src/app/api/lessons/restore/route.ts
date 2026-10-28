import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";
import type { LessonStructure } from "@/lib/teaching-types";

type RestoreLessonPayload = {
  studentId: string;
  materialId: string | null;
  rawDate: string;
  durationMinutes: number;
  status: "planned" | "completed" | "cancelled";
  title: string;
  topic: string;
  skillFocus: string;
  lessonGoal: string;
  lessonStructure: LessonStructure;
  teacherNotes: string;
  homeworkAssigned: string;
  studentPerformance: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before restoring a lesson." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { lesson?: RestoreLessonPayload };
    const lesson = body.lesson;
    if (!lesson?.studentId || !lesson.rawDate) {
      return NextResponse.json({ ok: false, error: "Missing lesson restore payload." }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.restore.api] deleted lesson payload stored for undo", lesson);
    }

    const { data: createdRows, error: createError } = await supabase.rpc("create_lesson_secure", {
      p_user_id: user.id,
      p_student_id: lesson.studentId,
      p_material_id: lesson.materialId,
      p_lesson_date: lesson.rawDate,
      p_duration_minutes: lesson.durationMinutes || 45,
      p_status: lesson.status || "planned",
      p_title: lesson.title,
      p_topic: lesson.topic,
      p_skill_focus: lesson.skillFocus,
      p_lesson_goal: lesson.lessonGoal,
      p_lesson_structure: lesson.lessonStructure,
      p_lesson_notes: lesson.teacherNotes || "",
      p_topics_covered: [lesson.topic].filter(Boolean)
    });

    if (createError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[lessons.restore.api] supabase restore error (create step)", createError);
      }
      return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
    }

    const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;
    if (!created?.id) {
      return NextResponse.json({ ok: false, error: "Restore created no lesson row." }, { status: 500 });
    }

    const updatePayload = {
      homework_assigned: lesson.homeworkAssigned || "",
      student_performance: lesson.studentPerformance || ""
    };

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.restore.api] restore insert/upsert payload", {
        created_id: created.id,
        updatePayload
      });
    }

    const { error: updateError } = await supabase
      .from("lessons")
      .update(updatePayload)
      .eq("id", created.id)
      .eq("user_id", user.id);

    if (updateError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[lessons.restore.api] supabase restore error (update step)", updateError);
      }
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    const { data: restoredRow, error: restoredReadError } = await supabase
      .from("lessons")
      .select(
        "id,created_at,updated_at,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,lesson_notes,homework_assigned,student_performance,students(name,level),materials(title)"
      )
      .eq("id", created.id)
      .eq("user_id", user.id)
      .single();

    if (restoredReadError || !restoredRow) {
      if (process.env.NODE_ENV === "development") {
        console.error("[lessons.restore.api] supabase restore response read error", restoredReadError);
      }
      return NextResponse.json({ ok: false, error: restoredReadError?.message || "Could not read restored lesson." }, { status: 500 });
    }

    const restored = restoredRow as {
      id: string;
      student_id: string;
      material_id: string | null;
      lesson_date: string;
      duration_minutes: number;
      status: "planned" | "completed" | "cancelled";
      title: string;
      topic: string;
      skill_focus: string;
      lesson_goal: string;
      lesson_structure: LessonStructure;
      created_at?: string;
      updated_at?: string;
      lesson_notes: string;
      homework_assigned: string;
      student_performance: string;
      students?: { name?: string; level?: string } | Array<{ name?: string; level?: string }>;
      materials?: { title?: string } | Array<{ title?: string }>;
    };

    const studentName = Array.isArray(restored.students) ? restored.students[0]?.name : restored.students?.name;
    const studentLevel = Array.isArray(restored.students) ? restored.students[0]?.level : restored.students?.level;
    const materialTitle = Array.isArray(restored.materials) ? restored.materials[0]?.title : restored.materials?.title;
    trackEvent("lesson_restored", { lessonId: restored.id, studentId: restored.student_id, status: restored.status });

    return NextResponse.json({
      ok: true,
      lesson: {
        id: restored.id,
        createdAt: restored.created_at || new Date().toISOString(),
        updatedAt: restored.updated_at || restored.created_at || new Date().toISOString(),
        studentId: restored.student_id,
        studentName: studentName || "Student",
        studentLevel: studentLevel || "B1",
        materialId: restored.material_id,
        materialTitle: materialTitle || "",
        rawDate: restored.lesson_date,
        date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
          new Date(`${restored.lesson_date}T00:00:00`)
        ),
        durationMinutes: restored.duration_minutes,
        status: restored.status,
        title: restored.title,
        focus: restored.skill_focus || "Speaking",
        topic: restored.topic || "",
        skillFocus: restored.skill_focus || "Speaking",
        lessonGoal: restored.lesson_goal || "",
        lessonStructure: restored.lesson_structure,
        teacherNotes: restored.lesson_notes || "",
        homeworkAssigned: restored.homework_assigned || "",
        studentPerformance: restored.student_performance || ""
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not restore lesson." },
      { status: 500 }
    );
  }
}
