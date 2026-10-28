import { NextResponse } from "next/server";
import { extractMaterialMetadata } from "@/lib/material-intelligence";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedMaterialContent } from "@/lib/teaching-types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before updating materials." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      materialId?: string;
      title?: string;
      content?: GeneratedMaterialContent;
    };

    const materialId = String(body.materialId || "");
    const title = String(body.title || "").trim();
    const content = body.content;

    if (!materialId) return NextResponse.json({ ok: false, error: "Missing material id." }, { status: 400 });
    if (!title) return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
    if (!content) return NextResponse.json({ ok: false, error: "Content is required." }, { status: 400 });

    const { data: existing, error: readError } = await supabase
      .from("materials")
      .select("topic,level,skill,exercise_type")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .single();

    if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });

    const metadata = extractMaterialMetadata({
      title,
      topic: String(existing.topic || content.studentSheet?.topic || ""),
      level: existing.level,
      materialType: String(existing.exercise_type || ""),
      skillFocus: String(existing.skill || ""),
      content
    });

    const updatePayload = {
      title,
      content,
      summary: content.objective || "",
      metadata
    };
    let { error } = await supabase
      .from("materials")
      .update(updatePayload)
      .eq("id", materialId)
      .eq("user_id", user.id);

    if (error && isMissingMetadataColumnError(error)) {
      const { metadata: _metadata, ...fallbackPayload } = updatePayload;
      const fallback = await supabase.from("materials").update(fallbackPayload).eq("id", materialId).eq("user_id", user.id);
      error = fallback.error;
    }

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update material." },
      { status: 500 }
    );
  }
}

function isMissingMetadataColumnError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message || "";
  return error?.code === "42703" || /metadata.*does not exist/i.test(message) || /Could not find.*metadata/i.test(message);
}
