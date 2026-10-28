import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeLessonPlan, parseCompleteLessonFormData } from "@/lib/supabase/teaching-data";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before completing a lesson." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const lessonId = String(formData.get("lessonId") || "");
    if (!lessonId) return NextResponse.json({ ok: false, error: "Missing lesson id." }, { status: 400 });
    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.complete.api] update request", {
        lesson_id: lessonId,
        previous_status: "planned",
        new_status: "completed"
      });
    }

    await completeLessonPlan(user.id, lessonId, parseCompleteLessonFormData(formData));
    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.complete.api] update response", { lesson_id: lessonId, ok: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[lessons.complete.api] update error", error);
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not complete lesson." },
      { status: 500 }
    );
  }
}
