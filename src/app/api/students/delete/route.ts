import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before deleting a student." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { studentId?: string };
    const studentId = String(body.studentId || "");
    if (!studentId) return NextResponse.json({ ok: false, error: "Missing student id." }, { status: 400 });

    const { error } = await supabase.from("students").delete().eq("id", studentId).eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete student." },
      { status: 500 }
    );
  }
}
