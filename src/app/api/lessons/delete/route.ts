import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";
import { deleteLessonPlan } from "@/lib/supabase/teaching-data";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before deleting a lesson." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { lessonId?: string };
    const lessonId = String(body.lessonId || "");
    if (!lessonId) return NextResponse.json({ ok: false, error: "Missing lesson id." }, { status: 400 });

    await deleteLessonPlan(user.id, lessonId);
    trackEvent("lesson_deleted", { lessonId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete lesson." },
      { status: 500 }
    );
  }
}
