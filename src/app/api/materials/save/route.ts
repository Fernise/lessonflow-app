import { NextResponse } from "next/server";
import { extractMaterialMetadata } from "@/lib/material-intelligence";
import { createClient } from "@/lib/supabase/server";
import { assignMaterialToLesson } from "@/lib/supabase/teaching-data";
import type { CefrLevel } from "@/lib/types";
import type { GeneratedMaterialContent, MaterialType } from "@/lib/teaching-types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before saving material." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      studentId?: string;
      materialType?: MaterialType;
      topic?: string;
      level?: CefrLevel;
      skillFocus?: string;
      content?: GeneratedMaterialContent;
      generationId?: string;
      lessonId?: string;
    };

    const studentId = String(body.studentId || "");
    const topic = String(body.topic || "");
    const skillFocus = String(body.skillFocus || "");
    const materialType = String(body.materialType || "Speaking questions");
    const level = String(body.level || "B1") as CefrLevel;
    const content = body.content;
    const generationId = String(body.generationId || "");
    const lessonId = String(body.lessonId || "");

    if (!studentId) return NextResponse.json({ ok: false, error: "Choose a student before saving." }, { status: 400 });
    if (!content?.title) return NextResponse.json({ ok: false, error: "Generate material before saving." }, { status: 400 });
    const metadata = extractMaterialMetadata({
      title: content.title,
      topic,
      level,
      materialType,
      skillFocus,
      content
    });

    const {
      data: { user: authUser },
      error: authError
    } = await supabase.auth.getUser();

    const { data: ownedStudent, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (process.env.NODE_ENV === "development") {
      console.info("[materials.save.api] auth user id", authUser?.id || null);
      console.info("[materials.save.api] insert payload", {
        user_id: user.id,
        student_id: studentId,
        topic,
        level,
        skill: skillFocus,
        exercise_type: materialType
      });
    }

    if (authError || !authUser) {
      return NextResponse.json({ ok: false, error: "No authenticated Supabase user found." }, { status: 401 });
    }
    if (studentError) {
      return NextResponse.json({ ok: false, error: studentError.message }, { status: 500 });
    }
    if (!ownedStudent) {
      return NextResponse.json({ ok: false, error: "Selected student does not belong to this user." }, { status: 403 });
    }

    const insertPayload = {
      user_id: user.id,
      student_id: studentId,
      title: content.title,
      level,
      skill: skillFocus,
      topic,
      exercise_type: materialType,
      summary: content.objective,
      content,
      metadata
    };
    let { data: material, error: materialError } = await supabase
      .from("materials")
      .insert(insertPayload)
      .select("id")
      .single();

    if (materialError && isMissingMetadataColumnError(materialError)) {
      const { metadata: _metadata, ...fallbackPayload } = insertPayload;
      const fallback = await supabase.from("materials").insert(fallbackPayload).select("id").single();
      material = fallback.data;
      materialError = fallback.error;
    }

    if (materialError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[materials.save.api] supabase error", {
          message: materialError.message,
          code: materialError.code,
          details: materialError.details,
          hint: materialError.hint
        });
      }
      return NextResponse.json({ ok: false, error: materialError.message }, { status: 500 });
    }
    if (!material?.id) {
      return NextResponse.json({ ok: false, error: "Material save did not return an id." }, { status: 500 });
    }

    if (generationId) {
      await supabase
        .from("ai_generations")
        .update({ material_id: material.id })
        .eq("id", generationId)
        .eq("user_id", user.id);
    }

    if (lessonId) {
      await assignMaterialToLesson(user.id, lessonId, material.id);
    }

    return NextResponse.json({ ok: true, materialId: material.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save material." },
      { status: 500 }
    );
  }
}

function isMissingMetadataColumnError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message || "";
  return error?.code === "42703" || /metadata.*does not exist/i.test(message) || /Could not find.*metadata/i.test(message);
}
