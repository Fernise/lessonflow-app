import type { LessonPlanSummary, LessonStructure, TeachingMaterial } from "./teaching-types";

export const materialReadinessTypes = ["Speaking", "Vocabulary", "Listening", "Quiz", "Roleplay"] as const;

export type MaterialReadinessType = (typeof materialReadinessTypes)[number];

export function getAttachedMaterialIds(lesson: Pick<LessonPlanSummary, "materialId" | "lessonStructure">) {
  return normalizeMaterialIds([
    lesson.materialId || "",
    ...normalizeMaterialIds(lesson.lessonStructure?.attachedMaterialIds || [])
  ]);
}

export function withAttachedMaterialId(structure: LessonStructure, materialId: string): LessonStructure {
  return {
    ...structure,
    attachedMaterialIds: normalizeMaterialIds([...(structure.attachedMaterialIds || []), materialId])
  };
}

export function withoutAttachedMaterialId(structure: LessonStructure, materialId: string): LessonStructure {
  return {
    ...structure,
    attachedMaterialIds: normalizeMaterialIds(structure.attachedMaterialIds || []).filter((id) => id !== materialId)
  };
}

export function getAttachedMaterials(
  lesson: Pick<LessonPlanSummary, "materialId" | "lessonStructure">,
  materials: TeachingMaterial[]
) {
  const ids = new Set(getAttachedMaterialIds(lesson));
  return materials.filter((material) => ids.has(material.id));
}

export function getMaterialKind(material: Pick<TeachingMaterial, "exerciseType" | "skill" | "metadata">): MaterialReadinessType | "Roleplay" | "Other" {
  const typeText = `${material.metadata?.materialType || ""} ${material.exerciseType || ""}`.toLowerCase();
  if (typeText.includes("quiz")) return "Quiz";
  if (typeText.includes("roleplay")) return "Roleplay";
  if (typeText.includes("listening")) return "Listening";
  if (typeText.includes("vocabulary")) return "Vocabulary";
  if (typeText.includes("speaking") || typeText.includes("conversation")) return "Speaking";

  const text = `${material.skill || ""} ${(material.metadata?.skills || []).join(" ")}`.toLowerCase();
  if (text.includes("quiz")) return "Quiz";
  if (text.includes("roleplay")) return "Roleplay";
  if (text.includes("listening")) return "Listening";
  if (text.includes("vocabulary")) return "Vocabulary";
  if (text.includes("speaking") || text.includes("conversation")) return "Speaking";
  return "Other";
}

export function getMaterialReadiness(attachedMaterials: TeachingMaterial[]) {
  return {
    Speaking: attachedMaterials.some((material) => getMaterialKind(material) === "Speaking"),
    Vocabulary: attachedMaterials.some((material) => getMaterialKind(material) === "Vocabulary"),
    Listening: attachedMaterials.some((material) => getMaterialKind(material) === "Listening"),
    Quiz: attachedMaterials.some((material) => getMaterialKind(material) === "Quiz"),
    Roleplay: attachedMaterials.some((material) => getMaterialKind(material) === "Roleplay")
  };
}

function normalizeMaterialIds(ids: string[]) {
  return Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean)));
}
