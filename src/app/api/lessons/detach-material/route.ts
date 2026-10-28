import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { detachMaterialFromLesson } from "@/lib/supabase/teaching-data";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const body = (await request.json()) as { lessonId?: string; materialId?: string };
    const lessonId = String(body.lessonId || "");
    const materialId = String(body.materialId || "");
    if (!lessonId || !materialId) {
      return NextResponse.json({ ok: false, error: "Lesson and material are required." }, { status: 400 });
    }
    await detachMaterialFromLesson(user.id, lessonId, materialId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not detach material." },
      { status: 500 }
    );
  }
}
