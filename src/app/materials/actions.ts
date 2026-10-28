"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { deleteMaterial, deleteMaterialsBulk, duplicateMaterial, setMaterialFavorite, updateMaterialContent } from "@/lib/supabase/teaching-data";

export async function duplicateMaterialAction(formData: FormData) {
  const { user } = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  if (!materialId) return;
  await duplicateMaterial(user.id, materialId);
  trackEvent("material_reused", { materialId });
  revalidatePath("/materials");
}

export async function toggleFavoriteMaterialAction(formData: FormData) {
  const { user } = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  const isFavorite = String(formData.get("isFavorite") || "") === "true";
  if (!materialId) return;
  await setMaterialFavorite(user.id, materialId, isFavorite);
  revalidatePath("/materials");
}

export async function deleteMaterialAction(formData: FormData) {
  const { user } = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  if (!materialId) return;
  await deleteMaterial(user.id, materialId);
  trackEvent("material_deleted", { materialId });
  revalidatePath("/materials");
}

export async function deleteMaterialsBulkAction(formData: FormData) {
  const { user } = await requireUser();
  const idsRaw = String(formData.get("materialIds") || "");
  const materialIds = idsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (materialIds.length === 0) return;
  await deleteMaterialsBulk(user.id, materialIds);
  trackEvent("material_deleted", { count: materialIds.length });
  revalidatePath("/materials");
}

export async function updateMaterialContentAction(formData: FormData) {
  const { user } = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  const contentJson = String(formData.get("contentJson") || "");
  if (!materialId || !contentJson) return;
  const content = JSON.parse(contentJson) as unknown;
  await updateMaterialContent(user.id, materialId, content);
  revalidatePath("/materials");
}

export async function updateMaterialAction(formData: FormData) {
  const { user } = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  if (!materialId) return;
  const contentJson = String(formData.get("contentJson") || "");
  if (!contentJson) return;
  const content = JSON.parse(contentJson) as unknown;
  await updateMaterialContent(user.id, materialId, content);
  revalidatePath("/materials");
}
