"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { linkGenerationToMaterial, saveGeneratedMaterialWithClient, type SaveMaterialInput } from "@/lib/supabase/teaching-data";
import type { CefrLevel } from "@/lib/types";
import type { GeneratedMaterialContent, MaterialType } from "@/lib/teaching-types";

export type SaveMaterialState = {
  ok?: boolean;
  error?: string;
  materialId?: string;
};

export async function saveGeneratedMaterialAction(
  _state: SaveMaterialState,
  formData: FormData
): Promise<SaveMaterialState> {
  try {
    const { user, supabase } = await requireUser();
    if (process.env.NODE_ENV === "development") {
      const {
        data: { user: authUser },
        error: authError
      } = await supabase.auth.getUser();
      console.info("[materials.save.action] auth snapshot", {
        expected_user_id: user.id,
        auth_user_id: authUser?.id || null,
        auth_error: authError?.message || null
      });
    }
    const content = JSON.parse(String(formData.get("content") || "{}")) as GeneratedMaterialContent;
    const input: SaveMaterialInput = {
      studentId: String(formData.get("studentId") || ""),
      materialType: String(formData.get("materialType") || "Speaking questions") as MaterialType,
      topic: String(formData.get("topic") || ""),
      level: String(formData.get("level") || "B1") as CefrLevel,
      skillFocus: String(formData.get("skillFocus") || ""),
      content
    };

    if (!input.studentId) throw new Error("Choose a student before saving.");
    if (!content.title) throw new Error("Generate material before saving.");

    const materialId = await saveGeneratedMaterialWithClient(supabase, user.id, input);
    const generationId = String(formData.get("generationId") || "");
    if (generationId) await linkGenerationToMaterial(user.id, generationId, materialId);
    revalidatePath("/materials");
    revalidatePath(`/students/${input.studentId}`);
    revalidatePath("/ai-generator");
    return { ok: true, materialId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save material." };
  }
}
