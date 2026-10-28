import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

type LessonStructurePayload = {
  warmUp?: string;
  review?: string;
  mainSpeakingTask?: string;
  vocabularyActivation?: string;
  listeningReadingActivity?: string;
  correctionAndFeedback?: string;
  homework?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before creating a lesson." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      studentId?: string;
      materialId?: string | null;
      date?: string;
      durationMinutes?: number;
      status?: "planned" | "completed" | "cancelled";
      topic?: string;
      skillFocus?: string;
      lessonGoal?: string;
      teacherNotes?: string;
      lessonStructure?: LessonStructurePayload;
    };

    const studentId = String(body.studentId || "");
    const materialId = body.materialId ? String(body.materialId) : null;
    const lessonDate = String(body.date || "");
    const durationMinutes = Number(body.durationMinutes || 45);
    const status = body.status || "planned";
    const topic = String(body.topic || "");
    const skillFocus = String(body.skillFocus || "Speaking");
    const lessonGoal = String(body.lessonGoal || "");
    const teacherNotes = String(body.teacherNotes || "");
    const lessonStructure = {
      warmUp: String(body.lessonStructure?.warmUp || ""),
      review: String(body.lessonStructure?.review || ""),
      mainSpeakingTask: String(body.lessonStructure?.mainSpeakingTask || ""),
      vocabularyActivation: String(body.lessonStructure?.vocabularyActivation || ""),
      listeningReadingActivity: String(body.lessonStructure?.listeningReadingActivity || ""),
      correctionAndFeedback: String(body.lessonStructure?.correctionAndFeedback || ""),
      homework: String(body.lessonStructure?.homework || "")
    };

    if (!studentId) return NextResponse.json({ ok: false, error: "Student is required." }, { status: 400 });
    if (!lessonDate) return NextResponse.json({ ok: false, error: "Date is required." }, { status: 400 });

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();
    const {
      data: { user: authUser },
      error: authError
    } = await supabase.auth.getUser();

    if (process.env.NODE_ENV === "development") {
      const jwtMeta = decodeJwtMeta(session?.access_token || "");
      console.info("[lessons.create.api] auth context", {
        has_session: Boolean(session),
        auth_user_id: authUser?.id || null,
        has_jwt: Boolean(session?.access_token),
        jwt_sub: jwtMeta.sub,
        jwt_role: jwtMeta.role,
        auth_error: authError?.message || null,
        session_error: sessionError?.message || null
      });
    }

    if (sessionError || authError || !authUser || !session?.access_token) {
      return NextResponse.json({ ok: false, error: "No authenticated session found for lesson creation." }, { status: 401 });
    }

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

    const { data: ownedStudent, error: studentError } = await authedDbClient
      .from("students")
      .select("id,name,level")
      .eq("id", studentId)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (studentError) return NextResponse.json({ ok: false, error: studentError.message }, { status: 500 });
    if (!ownedStudent) return NextResponse.json({ ok: false, error: "Selected student does not belong to this user." }, { status: 403 });

    let materialTitle = "";
    if (materialId) {
      const { data: ownedMaterial, error: materialError } = await authedDbClient
        .from("materials")
        .select("id,title")
        .eq("id", materialId)
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (materialError) return NextResponse.json({ ok: false, error: materialError.message }, { status: 500 });
      if (!ownedMaterial) return NextResponse.json({ ok: false, error: "Selected material does not belong to this user." }, { status: 403 });
      materialTitle = ownedMaterial.title;
    }

    const payload = {
      user_id: authUser.id,
      student_id: studentId,
      material_id: materialId,
      lesson_date: lessonDate,
      duration_minutes: durationMinutes,
      status,
      title: lessonGoal || `${topic} lesson`,
      topic,
      skill_focus: skillFocus,
      lesson_goal: lessonGoal,
      lesson_structure: lessonStructure,
      lesson_notes: teacherNotes,
      topics_covered: [topic].filter(Boolean)
    };

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.create.api] insert payload", payload);
      console.info("[lessons.create.api] session continuity", {
        expected_user_id: user.id,
        auth_user_id: authUser.id,
        has_access_token: Boolean(session.access_token)
      });
    }

    const { data: directInserted, error: insertError } = await authedDbClient
      .from("lessons")
      .insert(payload)
      .select(
        "id,created_at,updated_at,student_id,material_id,lesson_date,duration_minutes,status,title,topic,skill_focus,lesson_goal,lesson_structure,homework_assigned,lesson_notes,student_performance"
      )
      .single();

    let insertedLesson =
      (Array.isArray(directInserted) ? directInserted[0] : directInserted) || null;

    if (insertError && insertError.code === "42501") {
      if (process.env.NODE_ENV === "development") {
        console.warn("[lessons.create.api] direct insert blocked by RLS; trying secure RPC fallback");
      }
      const { data: rpcData, error: rpcError } = await authedDbClient.rpc("create_lesson_secure", {
        p_user_id: authUser.id,
        p_student_id: studentId,
        p_material_id: materialId,
        p_lesson_date: lessonDate,
        p_duration_minutes: durationMinutes,
        p_status: status,
        p_title: lessonGoal || `${topic} lesson`,
        p_topic: topic,
        p_skill_focus: skillFocus,
        p_lesson_goal: lessonGoal,
        p_lesson_structure: lessonStructure,
        p_lesson_notes: teacherNotes,
        p_topics_covered: [topic].filter(Boolean)
      });

      if (rpcError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[lessons.create.api] secure rpc fallback error", {
            message: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint
          });
        }
        return NextResponse.json({ ok: false, error: rpcError.message }, { status: 500 });
      }

      insertedLesson = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    } else if (insertError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[lessons.create.api] supabase insert error (insert step)", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
      }
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    if (!insertedLesson) return NextResponse.json({ ok: false, error: "Lesson inserted but no row returned." }, { status: 500 });

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.create.api] insert result", { lesson_id: insertedLesson.id });
    }

    trackEvent("lesson_created", {
      lessonId: insertedLesson.id,
      studentId,
      level: ownedStudent.level,
      duration: durationMinutes,
      status,
      topicPresent: Boolean(topic)
    });

    return NextResponse.json({
      ok: true,
      lesson: {
        id: insertedLesson.id,
        createdAt: insertedLesson.created_at || new Date().toISOString(),
        updatedAt: insertedLesson.updated_at || insertedLesson.created_at || new Date().toISOString(),
        studentId,
        studentName: ownedStudent.name,
        studentLevel: ownedStudent.level,
        materialId: insertedLesson.material_id,
        materialTitle,
        rawDate: insertedLesson.lesson_date,
        date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
          new Date(`${insertedLesson.lesson_date}T00:00:00`)
        ),
        durationMinutes: insertedLesson.duration_minutes,
        status: insertedLesson.status,
        title: insertedLesson.title,
        focus: insertedLesson.skill_focus || "Speaking",
        topic: insertedLesson.topic || "",
        skillFocus: insertedLesson.skill_focus || "Speaking",
        lessonGoal: insertedLesson.lesson_goal || "",
        lessonStructure: insertedLesson.lesson_structure || lessonStructure,
        teacherNotes: insertedLesson.lesson_notes || "",
        homeworkAssigned: insertedLesson.homework_assigned || "",
        studentPerformance: insertedLesson.student_performance || ""
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create lesson." },
      { status: 500 }
    );
  }
}

function decodeJwtMeta(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return { sub: null, role: null };
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json) as { sub?: string; role?: string };
    return { sub: parsed.sub || null, role: parsed.role || null };
  } catch {
    return { sub: null, role: null };
  }
}
