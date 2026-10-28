import { NextResponse } from "next/server";
import { extractMaterialMetadata } from "@/lib/material-intelligence";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedMaterialContent, MaterialMetadata } from "@/lib/teaching-types";
import type { CefrLevel } from "@/lib/types";

type RestoreMaterialPayload = {
  studentId: string | null;
  title: string;
  level: CefrLevel;
  skill: string;
  topic: string;
  exerciseType: string;
  summary: string;
  content?: GeneratedMaterialContent;
  isFavorite?: boolean;
  metadata?: MaterialMetadata;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before restoring material." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { material?: RestoreMaterialPayload };
    const material = body.material;
    if (!material?.title || !material?.level) {
      return NextResponse.json({ ok: false, error: "Missing material restore payload." }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[materials.restore.api] deleted payload", material);
    }
    const metadata =
      material.metadata ||
      extractMaterialMetadata({
        title: material.title,
        topic: material.topic,
        level: material.level,
        materialType: material.exerciseType,
        skillFocus: material.skill,
        content: material.content
      });

    const insertPayload = {
      user_id: user.id,
      student_id: material.studentId,
      title: material.title,
      level: material.level,
      skill: material.skill,
      topic: material.topic,
      exercise_type: material.exerciseType,
      summary: material.summary,
      content: material.content || {},
      is_favorite: Boolean(material.isFavorite),
      metadata
    };
    let { data: restored, error } = await supabase
      .from("materials")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error && isMissingMetadataColumnError(error)) {
      const { metadata: _metadata, ...fallbackPayload } = insertPayload;
      const fallback = await supabase.from("materials").insert(fallbackPayload).select("id").single();
      restored = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[materials.restore.api] supabase restore error", error);
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!restored?.id) {
      return NextResponse.json({ ok: false, error: "Material restore did not return an id." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, materialId: restored.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not restore material." },
      { status: 500 }
    );
  }
}

function isMissingMetadataColumnError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message || "";
  return error?.code === "42703" || /metadata.*does not exist/i.test(message) || /Could not find.*metadata/i.test(message);
}
