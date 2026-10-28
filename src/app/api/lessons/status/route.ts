import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before updating lesson status." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { lessonId?: string; status?: "planned" | "completed" | "cancelled" };
    const lessonId = String(body.lessonId || "");
    const status = body.status;

    if (!lessonId) return NextResponse.json({ ok: false, error: "Missing lesson id." }, { status: 400 });
    if (!status) return NextResponse.json({ ok: false, error: "Missing status." }, { status: 400 });

    const { data: existing, error: readError } = await supabase
      .from("lessons")
      .select("id,status")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .single();
    if (readError || !existing) {
      return NextResponse.json({ ok: false, error: readError?.message || "Lesson not found." }, { status: 404 });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.status.api] update request", {
        lesson_id: lessonId,
        previous_status: existing.status,
        new_status: status
      });
    }

    const { data: updated, error } = await supabase
      .from("lessons")
      .update({ status })
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .select("id,status")
      .single();

    if (error || !updated) {
      if (process.env.NODE_ENV === "development") {
        console.error("[lessons.status.api] update error", error);
      }
      return NextResponse.json({ ok: false, error: error?.message || "Could not update lesson status." }, { status: 500 });
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[lessons.status.api] update response", updated);
    }

    if (updated.status === "completed") {
      trackEvent("lesson_completed", { lessonId, status: updated.status });
    }

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update lesson status." },
      { status: 500 }
    );
  }
}
