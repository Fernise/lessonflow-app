import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in before deleting materials." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { materialId?: string };
    const materialId = String(body.materialId || "");
    if (!materialId) return NextResponse.json({ ok: false, error: "Missing material id." }, { status: 400 });

    const { error } = await supabase.from("materials").delete().eq("id", materialId).eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete material." },
      { status: 500 }
    );
  }
}
