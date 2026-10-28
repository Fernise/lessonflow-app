"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare2, ChevronDown, Copy, Eye, GripVertical, Pencil, Plus, Save, Search, Square, Star, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { duplicateMaterialAction, toggleFavoriteMaterialAction } from "@/app/materials/actions";
import { cefrLevels } from "@/lib/types";
import { materialToPlainText } from "@/lib/mock-generation";
import { trackEvent } from "@/lib/analytics";
import { getMaterialSearchText } from "@/lib/material-intelligence";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";
import type { GeneratedMaterialContent, TeachingMaterial, TeachingStudent } from "@/lib/teaching-types";

const allOption = "All";
const materialLibraryLevels = cefrLevels.filter((level) => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(level));
const defaultMaterialTypeOptions = ["Speaking Questions", "Vocabulary Sheet", "Listening Activity", "Quiz", "Roleplay", "Lesson Pack"];

type MaterialsLibraryProps = {
  materials: TeachingMaterial[] | null | undefined;
  students: TeachingStudent[] | null | undefined;
};

export function MaterialsLibrary({ materials, students }: MaterialsLibraryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeMaterials = useMemo(() => (Array.isArray(materials) ? materials : []), [materials]);
  const safeStudents = useMemo(() => (Array.isArray(students) ? students : []), [students]);
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if (!Array.isArray(materials)) console.info("[materials-library] nullable array guard", { variable: "materials", type: typeof materials, value: materials });
      if (!Array.isArray(students)) console.info("[materials-library] nullable array guard", { variable: "students", type: typeof students, value: students });
    }
  }, [materials, students]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>(() => {
    const studentId = searchParams.get("student");
    return studentId ? [studentId] : [];
  });
  const [favoriteFilter, setFavoriteFilter] = useState(allOption);
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState(searchParams.get("topic") || "");
  const [preview, setPreview] = useState<TeachingMaterial | null>(null);
  const [restoredMaterials, setRestoredMaterials] = useState<TeachingMaterial[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const pendingDeleteTimersRef = useRef<Record<string, number>>({});
  const deletedMaterialsRef = useRef<Map<string, { material: TeachingMaterial; deletedInDb: boolean }>>(new Map());
  const pendingDeleteIdsRef = useRef<string[]>([]);

  useEffect(() => {
    pendingDeleteIdsRef.current = pendingDeleteIds;
  }, [pendingDeleteIds]);

  const mergedMaterials = useMemo(() => {
    const byId = new Map<string, TeachingMaterial>();
    safeMaterials.forEach((item) => byId.set(item.id, item));
    restoredMaterials.forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }, [safeMaterials, restoredMaterials]);

  useEffect(() => {
    const materialId = searchParams.get("material");
    if (!materialId) return;
    const material = mergedMaterials.find((item) => item.id === materialId);
    if (material) setPreview(material);
  }, [mergedMaterials, searchParams]);

  useEffect(() => {
    setRestoredMaterials((current) => current.filter((item) => !safeMaterials.some((serverItem) => serverItem.id === item.id)));
  }, [safeMaterials]);

  const materialTypes = useMemo(
    () => Array.from(new Set([...defaultMaterialTypeOptions, ...mergedMaterials.map((material) => material.metadata?.materialType || material.exerciseType).filter((item): item is string => Boolean(item))])),
    [mergedMaterials]
  );
  const userTags = useMemo(
    () =>
      Array.from(
        new Set(mergedMaterials.flatMap((material) => getUserTagsForMaterial(material, tagOverrides)))
      ).sort((a, b) => a.localeCompare(b)),
    [mergedMaterials, tagOverrides]
  );
  const studentOptions = useMemo(() => safeStudents.map((student) => ({ value: student.id, label: student.name })), [safeStudents]);

  const filteredMaterials = useMemo(
    () =>
      mergedMaterials.filter((material) => {
        if (pendingDeleteIds.includes(material.id)) return false;
        const searchable = [
          material.title,
          material.summary,
          material.topic,
          material.skill,
          material.exerciseType,
          material.studentName,
          getUserTagsForMaterial(material, tagOverrides).join(" "),
          getMaterialSearchText(material.metadata)
        ].join(" ").toLowerCase();
        const materialTags = getUserTagsForMaterial(material, tagOverrides);

        return (
          (selectedLevels.length === 0 || selectedLevels.includes(material.level)) &&
          (selectedTypes.length === 0 || selectedTypes.includes(material.exerciseType) || selectedTypes.includes(material.metadata?.materialType || "")) &&
          (selectedTags.length === 0 || materialTags.some((item) => selectedTags.includes(item))) &&
          (selectedStudents.length === 0 || (material.studentId ? selectedStudents.includes(material.studentId) : false)) &&
          (favoriteFilter === allOption || material.isFavorite) &&
          (!query.trim() || searchable.includes(query.trim().toLowerCase()))
        );
      }),
    [mergedMaterials, selectedLevels, selectedTypes, selectedTags, selectedStudents, favoriteFilter, query, pendingDeleteIds, tagOverrides]
  );

  const activeFilterCount = selectedLevels.length + selectedTypes.length + selectedTags.length + selectedStudents.length + (favoriteFilter === "Favorites" ? 1 : 0);

  const visibleMaterialIds = useMemo(() => new Set(filteredMaterials.map((material) => material.id)), [filteredMaterials]);
  const activeSelectedIds = useMemo(() => selectedIds.filter((id) => visibleMaterialIds.has(id)), [selectedIds, visibleMaterialIds]);
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => visibleMaterialIds.has(id)));
  }, [visibleMaterialIds]);

  function queueDeleteWithUndo(ids: string[], label: string) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;
    uniqueIds.forEach((id) => {
      const material = mergedMaterials.find((item) => item.id === id);
      if (material) deletedMaterialsRef.current.set(id, { material, deletedInDb: false });
    });
    trackEvent("material_deleted", { count: uniqueIds.length });
    setPendingDeleteIds((current) => Array.from(new Set([...current, ...uniqueIds])));
    showToast({
      type: "info",
      title: label,
      description: "Undo available for 5 seconds.",
      durationMs: 5000,
      actionLabel: "Undo",
      onAction: async () => {
        const toRestore = uniqueIds
          .map((id) => ({ id, tracking: deletedMaterialsRef.current.get(id) }))
          .filter((entry) => entry.tracking?.deletedInDb);

        uniqueIds.forEach((id) => {
          const timer = pendingDeleteTimersRef.current[id];
          if (timer) window.clearTimeout(timer);
          delete pendingDeleteTimersRef.current[id];
        });

        if (toRestore.length > 0) {
          try {
            const results = await Promise.all(
              toRestore.map(async ({ id, tracking }) => {
                if (!tracking) return { id, ok: false, error: "Missing restore payload." };
                if (process.env.NODE_ENV === "development") {
                  console.info("[materials.undo] deleted payload", tracking.material);
                }
                const response = await fetch("/api/materials/restore", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    material: {
                      studentId: tracking.material.studentId,
                      title: tracking.material.title,
                      level: tracking.material.level,
                      skill: tracking.material.skill,
                      topic: tracking.material.topic,
                      exerciseType: tracking.material.exerciseType,
                      summary: tracking.material.summary,
                      content: tracking.material.content,
                      isFavorite: tracking.material.isFavorite,
                      metadata: tracking.material.metadata
                    }
                  })
                });
                const payload = (await response.json()) as { ok?: boolean; error?: string; materialId?: string };
                if (process.env.NODE_ENV === "development") {
                  console.info("[materials.undo] restore response", payload);
                }
                if (!response.ok || !payload.ok || !payload.materialId) {
                  return { id, ok: false, error: payload.error || "Could not restore material." };
                }
                return { id, ok: true, materialId: payload.materialId, material: tracking.material };
              })
            );

            const failed = results.find((result) => !result.ok);
            if (failed) throw new Error(failed.error || "Could not restore material.");

            const restored = results.filter((result): result is { id: string; ok: true; materialId: string; material: TeachingMaterial } => result.ok);
            setRestoredMaterials((current) => [...restored.map((item) => ({ ...item.material, id: item.materialId })), ...current]);
            if (process.env.NODE_ENV === "development") {
              console.info("[materials.undo] refetch result count (before refresh)", restored.length);
            }
          } catch (error) {
            showToast({
              type: "error",
              title: "Restore failed",
              description: error instanceof Error ? error.message : "Could not restore materials."
            });
            return;
          }
        }

        setPendingDeleteIds((current) => current.filter((id) => !uniqueIds.includes(id)));
        uniqueIds.forEach((id) => deletedMaterialsRef.current.delete(id));
        showToast({ type: "success", title: "Material restored" });
        router.refresh();
      }
    });

    uniqueIds.forEach((materialId) => {
      if (pendingDeleteTimersRef.current[materialId]) window.clearTimeout(pendingDeleteTimersRef.current[materialId]);
      pendingDeleteTimersRef.current[materialId] = window.setTimeout(async () => {
        const stillPending = pendingDeleteIdsRef.current.includes(materialId);
        if (!stillPending) return;
        try {
          const response = await fetch("/api/materials/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ materialId })
          });
          const payload = (await response.json()) as { ok?: boolean; error?: string };
          if (!response.ok || !payload.ok) throw new Error(payload.error || "Delete failed");
          const tracking = deletedMaterialsRef.current.get(materialId);
          if (tracking) deletedMaterialsRef.current.set(materialId, { ...tracking, deletedInDb: true });
          setPendingDeleteIds((current) => current.filter((id) => id !== materialId));
        } catch (error) {
          setPendingDeleteIds((current) => current.filter((id) => id !== materialId));
          showToast({ type: "error", title: "Delete failed", description: error instanceof Error ? error.message : "Delete failed" });
        } finally {
          delete pendingDeleteTimersRef.current[materialId];
        }
      }, 5000);
    });
  }

  function handleDeleteWithUndo(material: TeachingMaterial) {
    queueDeleteWithUndo([material.id], "Material deleted");
  }

  async function handleBulkDelete() {
    if (activeSelectedIds.length === 0 || isBulkDeleting) return;
    if (!window.confirm(`Delete ${activeSelectedIds.length} selected material(s)?`)) return;

    const idsToDelete = [...activeSelectedIds];
    setIsBulkDeleting(true);
    setSelectedIds([]);

    try {
      queueDeleteWithUndo(idsToDelete, `${idsToDelete.length} materials deleted`);
    } catch (error) {
      showToast({
        type: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete selected materials."
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function removeFilterValue(values: string[], onChange: (nextValues: string[]) => void, value: string) {
    onChange((Array.isArray(values) ? values : []).filter((item) => item !== value));
  }

  async function updateMaterialTags(material: TeachingMaterial, tags: string[]) {
    const content = material.content || createMinimalMaterialContent(material);
    const nextContent = { ...content, userTags: normalizeUserTags(tags) };
    setTagOverrides((current) => ({ ...current, [material.id]: nextContent.userTags || [] }));
    if (preview?.id === material.id) {
      setPreview({ ...preview, content: nextContent });
    }
    try {
      const response = await fetch("/api/materials/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: material.id,
          title: material.title,
          content: nextContent
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not update tags.");
      showToast({ type: "success", title: "Tags updated" });
      router.refresh();
    } catch (error) {
      setTagOverrides((current) => {
        const next = { ...current };
        delete next[material.id];
        return next;
      });
      showToast({ type: "error", title: "Tags could not be saved", description: error instanceof Error ? error.message : "Try again." });
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, topic, type, level, tags, summary..."
            className="w-full rounded-2xl border border-rose-100 bg-white py-3 pl-10 pr-3 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MultiFilter label="Type" values={selectedTypes} onChange={setSelectedTypes} options={materialTypes.map((item) => ({ value: item, label: item }))} />
          <MultiFilter label="Level" values={selectedLevels} onChange={setSelectedLevels} options={materialLibraryLevels.map((item) => ({ value: item, label: item }))} />
          <MultiFilter label="Student" values={selectedStudents} onChange={setSelectedStudents} options={studentOptions} />
          <div className="min-w-[140px]">
            <Filter label="Favorites" value={favoriteFilter} onChange={setFavoriteFilter} options={[allOption, "Favorites"]} compact />
          </div>
          <MultiFilter
            label="Tags"
            values={selectedTags}
            onChange={setSelectedTags}
            options={userTags.map((item) => ({ value: item, label: item }))}
            emptyText="No tags yet. Add tags to organize materials."
          />
        </div>
        {activeFilterCount > 0 ? (
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {selectedLevels.map((value) => <ActiveFilterChip key={`level-${value}`} label={`Level: ${value}`} onRemove={() => removeFilterValue(selectedLevels, setSelectedLevels, value)} />)}
              {selectedTypes.map((value) => <ActiveFilterChip key={`type-${value}`} label={`Type: ${value}`} onRemove={() => removeFilterValue(selectedTypes, setSelectedTypes, value)} />)}
              {selectedTags.map((value) => <ActiveFilterChip key={`tag-${value}`} label={`Tag: ${value}`} onRemove={() => removeFilterValue(selectedTags, setSelectedTags, value)} />)}
              {selectedStudents.map((value) => (
                <ActiveFilterChip
                  key={`student-${value}`}
                  label={`Student: ${studentOptions.find((item) => item.value === value)?.label || value}`}
                  onRemove={() => removeFilterValue(selectedStudents, setSelectedStudents, value)}
                />
              ))}
              {favoriteFilter === "Favorites" ? <ActiveFilterChip label="Favorites" onRemove={() => setFavoriteFilter(allOption)} /> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTypes([]);
                setSelectedLevels([]);
                setSelectedTags([]);
                setSelectedStudents([]);
                setFavoriteFilter(allOption);
                setQuery("");
              }}
              className="shrink-0 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
            >
              Clear all
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-[#1F2937]">{filteredMaterials.length}</span> materials found
            {mergedMaterials.length !== filteredMaterials.length ? (
              <> · filtered from <span className="font-semibold text-[#1F2937]">{mergedMaterials.length}</span></>
            ) : null}
          </p>
        </div>
      </section>

      {mergedMaterials.length === 0 ? (
        <EmptyState title="No materials yet" text="Generate your first material in AI Generator, then save it to build your reusable library." />
      ) : (
        <>
        {activeSelectedIds.length > 0 ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm font-semibold text-[#1F2937]">{activeSelectedIds.length} selected</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
              <button
                type="button"
                data-testid="delete-material-bulk"
                onClick={handleBulkDelete}
                disabled={activeSelectedIds.length === 0 || isBulkDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Trash2 size={16} aria-hidden="true" />
                {isBulkDeleting ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          </section>
        ) : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <article
              key={material.id}
              className={`rounded-3xl border p-5 shadow-sm transition ${
                activeSelectedSet.has(material.id) ? "border-[#FF4F7B] bg-rose-50" : "border-rose-100 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((current) =>
                        current.includes(material.id) ? current.filter((id) => id !== material.id) : [...current, material.id]
                      )
                    }
                    className={`mb-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                      activeSelectedSet.has(material.id)
                        ? "border-[#FF4F7B] bg-rose-100 text-[#E63E69]"
                        : "border-rose-200 text-slate-600 hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                    }`}
                  >
                    {activeSelectedSet.has(material.id) ? <CheckSquare2 size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
                    {activeSelectedSet.has(material.id) ? "Selected" : "Select"}
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">
                    {material.level} · {material.metadata?.materialType || material.exerciseType}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[#1F2937]">{material.title}</h2>
                </div>
                <form action={toggleFavoriteMaterialAction}>
                  <input type="hidden" name="materialId" value={material.id} />
                  <input type="hidden" name="isFavorite" value={String(!material.isFavorite)} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-100 p-2 text-[#FF4F7B] transition hover:border-[#FF4F7B]"
                    aria-label={material.isFavorite ? "Remove favorite" : "Favorite material"}
                  >
                    <Star size={17} fill={material.isFavorite ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                </form>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{material.summary}</p>
              {material.content ? (
                <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity steps</p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
                    {(material.content.activitySteps || material.content.studentSheet?.speakingQuestions || []).slice(0, 3).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-[#FF4F7B]">{material.level}</span>
                <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-[#FF4F7B]">{material.metadata?.materialType || material.exerciseType}</span>
                <span className="rounded-xl bg-[#FFF5F8] px-2 py-1 text-[#FF4F7B]">{material.metadata?.topic || material.topic}</span>
                {material.metadata?.subtopic && material.metadata.subtopic !== material.topic ? (
                  <span className="rounded-xl bg-rose-50 px-2 py-1 text-rose-500">{material.metadata.subtopic}</span>
                ) : null}
                <span className="rounded-xl bg-slate-50 px-2 py-1 text-slate-600">{material.studentName}</span>
                <span className="rounded-xl bg-slate-50 px-2 py-1 text-slate-600">{material.createdAt}</span>
              </div>
              <TagEditor
                tags={getUserTagsForMaterial(material, tagOverrides)}
                onSave={(tags) => updateMaterialTags(material, tags)}
                compact
              />
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreview(material);
                    trackEvent("material_opened", {
                      materialId: material.id,
                      materialType: material.exerciseType,
                      level: material.level,
                      topicPresent: Boolean(material.topic)
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
                >
                  <Eye size={16} aria-hidden="true" />
                  Preview
                </button>
                <form action={duplicateMaterialAction}>
                  <input type="hidden" name="materialId" value={material.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                  >
                    <Copy size={16} aria-hidden="true" />
                    Duplicate
                  </button>
                </form>
                <button
                  type="button"
                  data-testid="delete-material"
                  onClick={() => handleDeleteWithUndo(material)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
        </>
      )}

      {mergedMaterials.length > 0 && filteredMaterials.length === 0 ? (
        <EmptyState title="No materials match these filters." text="Try removing a filter or searching for a broader topic." />
      ) : null}
      {preview ? <PreviewModal material={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function PreviewModal({ material, onClose }: { material: TeachingMaterial; onClose: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [title, setTitle] = useState(material.title);
  const [content, setContent] = useState<GeneratedMaterialContent | null>(material.content || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState<{ id: string; title: string; value: string; helper?: string } | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const sectionUndoTimersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const ids = getRenderableSectionIds(material.exerciseType, content);
    setSectionOrder((current) => reconcileSectionOrder(current.length > 0 ? current : content?.studentSheet?.sectionOrder || [], ids));
  }, [material.exerciseType, content]);

  useEffect(() => {
    const timers = sectionUndoTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  async function copyMaterial() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(materialToPlainText(content));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function toggleSectionSelection(sectionId: string) {
    setSelectedSectionIds((current) => (current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]));
  }

  function clearSelectionMode() {
    setIsSelectionMode(false);
    setSelectedSectionIds([]);
  }

  function openEditor(sectionId: string, titleText: string, items: string[], helper?: string) {
    setEditingSection({ id: sectionId, title: titleText, value: items.join("\n"), helper });
  }

  function applySectionEdit(sectionId: string, lines: string[]) {
    setContent((current) => {
      if (!current?.studentSheet) return current;
      const next = { ...current, studentSheet: { ...current.studentSheet } };
      if (sectionId === "speaking-easier") next.studentSheet.easierQuestions = lines;
      if (sectionId === "speaking-main") next.studentSheet.mainDiscussionQuestions = lines;
      if (sectionId === "speaking-deeper") next.studentSheet.deeperDiscussionQuestions = lines;
      if (sectionId === "speaking-fallback") next.studentSheet.speakingQuestions = lines;
      if (sectionId === "vocabulary-main") next.studentSheet.vocabulary = lines;
      if (sectionId === "vocabulary-phrases") next.studentSheet.usefulPhrases = lines;
      if (sectionId.startsWith("vocabulary-section-")) {
        const index = Number(sectionId.replace("vocabulary-section-", ""));
        next.studentSheet.vocabularySections = (next.studentSheet.vocabularySections || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (sectionId.startsWith("quiz-section-")) {
        const index = Number(sectionId.replace("quiz-section-", ""));
        next.studentSheet.quizSections = (next.studentSheet.quizSections || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (sectionId.startsWith("roleplay-section-")) {
        const index = Number(sectionId.replace("roleplay-section-", ""));
        const [situation, ...discuss] = lines;
        next.studentSheet.roleplayScenarios = (next.studentSheet.roleplayScenarios || []).map((section, idx) =>
          idx === index ? { ...section, situation: situation ?? "", discuss } : section
        );
      }
      if (sectionId === "listening-transcript") next.studentSheet.transcript = lines.join(" ");
      if (sectionId === "listening-word-bank") next.studentSheet.wordBank = lines;
      if (sectionId === "listening-follow-up") next.studentSheet.followUpDiscussion = lines;
      if (sectionId.startsWith("listening-section-")) {
        const index = Number(sectionId.replace("listening-section-", ""));
        next.studentSheet.listeningExercises = (next.studentSheet.listeningExercises || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      if (sectionId.startsWith("listening-vocabulary-")) {
        const index = Number(sectionId.replace("listening-vocabulary-", ""));
        next.studentSheet.optionalVocabulary = (next.studentSheet.optionalVocabulary || []).map((section, idx) =>
          idx === index ? { ...section, items: lines } : section
        );
      }
      return next;
    });
  }

  function addSection() {
    if (!content?.studentSheet) return;
    const titleText = newSectionTitle.trim();
    const lines = newSectionContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!titleText || lines.length === 0) return;

    setContent((current) => {
      if (!current?.studentSheet) return current;
      const next = { ...current, studentSheet: { ...current.studentSheet } };
      const type = material.exerciseType.toLowerCase();

      if (type.includes("quiz")) {
        next.studentSheet.quizSections = [...(next.studentSheet.quizSections || []), { title: titleText, items: lines }];
      } else if (type.includes("roleplay")) {
        const [situation, ...discuss] = lines;
        next.studentSheet.roleplayScenarios = [
          ...(next.studentSheet.roleplayScenarios || []),
          { title: titleText, situation: situation || "", discuss }
        ];
      } else if (type.includes("vocabulary")) {
        next.studentSheet.vocabularySections = [...(next.studentSheet.vocabularySections || []), { title: titleText, items: lines }];
      } else if (type.includes("listening")) {
        const lower = titleText.toLowerCase();
        if (lower.includes("transcript")) {
          next.studentSheet.transcript = lines.join(" ");
        } else if (lower.includes("word bank")) {
          next.studentSheet.wordBank = [...(next.studentSheet.wordBank || []), ...lines];
        } else if (lower.includes("follow")) {
          next.studentSheet.followUpDiscussion = [...(next.studentSheet.followUpDiscussion || []), ...lines];
        } else if (lower.includes("vocab")) {
          next.studentSheet.optionalVocabulary = [...(next.studentSheet.optionalVocabulary || []), { title: titleText, items: lines }];
        } else {
          next.studentSheet.listeningExercises = [...(next.studentSheet.listeningExercises || []), { title: titleText, items: lines }];
        }
      } else {
        const lower = titleText.toLowerCase();
        if (lower.includes("easy") || lower.includes("b1")) {
          next.studentSheet.easierQuestions = [...(next.studentSheet.easierQuestions || []), ...lines];
        } else if (lower.includes("deep") || lower.includes("advanced") || lower.includes("c1")) {
          next.studentSheet.deeperDiscussionQuestions = [...(next.studentSheet.deeperDiscussionQuestions || []), ...lines];
        } else {
          next.studentSheet.mainDiscussionQuestions = [...(next.studentSheet.mainDiscussionQuestions || []), ...lines];
        }
      }
      next.studentSheet.sectionOrder = reconcileSectionOrder(sectionOrder, getRenderableSectionIds(material.exerciseType, next));
      return next;
    });

    setAddingSection(false);
    setNewSectionTitle("");
    setNewSectionContent("");
    showToast({ type: "success", title: "Section added" });
  }

  function reorderSection(fromId: string, toId: string) {
    if (fromId === toId) return;
    setSectionOrder((current) => {
      const from = current.indexOf(fromId);
      const to = current.indexOf(toId);
      if (from === -1 || to === -1) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    showToast({ type: "success", title: "Section order updated" });
  }

  function deleteSelectedSections() {
    deleteSections(selectedSectionIds, `Delete ${selectedSectionIds.length} selected section(s)?`);
  }

  function deleteSingleSection(sectionId: string) {
    deleteSections([sectionId], "Delete this section?");
  }

  function deleteSections(sectionIds: string[], confirmMessage: string) {
    if (!content?.studentSheet || sectionIds.length === 0) return;
    if (!window.confirm(confirmMessage)) return;
    const undoId = Date.now() + Math.floor(Math.random() * 1000);
    const snapshot = structuredClone(content);
    const snapshotOrder = [...sectionOrder];
    for (const id of sectionIds) {
      applySectionEdit(id, []);
      if (id.startsWith("vocabulary-section-")) {
        const index = Number(id.replace("vocabulary-section-", ""));
        setContent((current) => {
          if (!current?.studentSheet) return current;
          return {
            ...current,
            studentSheet: {
              ...current.studentSheet,
              vocabularySections: (current.studentSheet.vocabularySections || []).filter((_, idx) => idx !== index)
            }
          };
        });
      }
      if (id.startsWith("quiz-section-")) {
        const index = Number(id.replace("quiz-section-", ""));
        setContent((current) => {
          if (!current?.studentSheet) return current;
          return {
            ...current,
            studentSheet: {
              ...current.studentSheet,
              quizSections: (current.studentSheet.quizSections || []).filter((_, idx) => idx !== index)
            }
          };
        });
      }
      if (id.startsWith("roleplay-section-")) {
        const index = Number(id.replace("roleplay-section-", ""));
        setContent((current) => {
          if (!current?.studentSheet) return current;
          return {
            ...current,
            studentSheet: {
              ...current.studentSheet,
              roleplayScenarios: (current.studentSheet.roleplayScenarios || []).filter((_, idx) => idx !== index)
            }
          };
        });
      }
      if (id === "listening-transcript") applySectionEdit(id, []);
      if (id === "listening-word-bank") applySectionEdit(id, []);
      if (id === "listening-follow-up") applySectionEdit(id, []);
      if (id.startsWith("listening-section-")) {
        const index = Number(id.replace("listening-section-", ""));
        setContent((current) => {
          if (!current?.studentSheet) return current;
          return {
            ...current,
            studentSheet: {
              ...current.studentSheet,
              listeningExercises: (current.studentSheet.listeningExercises || []).filter((_, idx) => idx !== index)
            }
          };
        });
      }
      if (id.startsWith("listening-vocabulary-")) {
        const index = Number(id.replace("listening-vocabulary-", ""));
        setContent((current) => {
          if (!current?.studentSheet) return current;
          return {
            ...current,
            studentSheet: {
              ...current.studentSheet,
              optionalVocabulary: (current.studentSheet.optionalVocabulary || []).filter((_, idx) => idx !== index)
            }
          };
        });
      }
    }
    clearSelectionMode();
    showToast({
      type: "info",
      title: "Sections deleted",
      description: "Undo available for 5 seconds.",
      durationMs: 5000,
      actionLabel: "Undo",
      onAction: () => {
        const timer = sectionUndoTimersRef.current.get(undoId);
        if (timer) window.clearTimeout(timer);
        sectionUndoTimersRef.current.delete(undoId);
        setContent(snapshot);
        setSectionOrder(snapshotOrder);
        showToast({ type: "success", title: "Sections restored" });
      }
    });
    const timer = window.setTimeout(() => {
      sectionUndoTimersRef.current.delete(undoId);
    }, 5000);
    sectionUndoTimersRef.current.set(undoId, timer);
  }

  async function saveChanges() {
    if (!content) return;
    const contentToSave = content.studentSheet
      ? { ...content, studentSheet: { ...content.studentSheet, sectionOrder } }
      : content;
    setIsSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/materials/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: material.id,
          title,
          content: contentToSave
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not save material.");
      showToast({ type: "success", title: "Material updated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save material.";
      setSaveError(message);
      showToast({ type: "error", title: "Update failed", description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">
              {material.level} · {material.skill} · {material.studentName}
            </p>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-2xl font-semibold text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
            />
            <p className="mt-2 text-sm leading-6 text-slate-600">{material.summary}</p>
            {content ? (
              <TagEditor
                tags={getMaterialUserTags(content)}
                onSave={(tags) => setContent({ ...content, userTags: normalizeUserTags(tags) })}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {content ? (
              <button
                type="button"
                onClick={() => setAddingSection(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              >
                <Plus size={16} aria-hidden="true" />
                Add section
              </button>
            ) : null}
            {content ? (
              <button
                type="button"
                onClick={copyMaterial}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              >
                <Copy size={16} aria-hidden="true" />
                {copyState === "copied" ? "Copied" : "Copy"}
              </button>
            ) : null}
            {content ? (
              <button
                type="button"
                onClick={saveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save size={16} aria-hidden="true" />
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-rose-100 p-2 text-slate-600 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              aria-label="Close preview"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        {content ? (
          <FullMaterial
            content={content}
            materialType={material.exerciseType}
            level={material.level}
            editable
            selectable={false}
            selectedSectionIds={selectedSectionIds}
            onToggleSelect={toggleSectionSelection}
            onEdit={openEditor}
            onDelete={deleteSingleSection}
            onDragStart={(id) => setDraggedSectionId(id)}
            onDragEnd={() => {
              setDraggedSectionId(null);
              setDragOverSectionId(null);
            }}
            onDragOver={(id) => {
              setDragOverSectionId(id);
              if (draggedSectionId && draggedSectionId !== id) {
                setSectionOrder((current) => {
                  const from = current.indexOf(draggedSectionId);
                  const to = current.indexOf(id);
                  if (from === -1 || to === -1 || from === to) return current;
                  const next = [...current];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  return next;
                });
              }
            }}
            onDropOn={(id) => {
              if (!draggedSectionId || draggedSectionId === id) return;
              reorderSection(draggedSectionId, id);
              setDraggedSectionId(null);
              setDragOverSectionId(null);
            }}
            draggedSectionId={draggedSectionId}
            dragOverSectionId={dragOverSectionId}
            sectionOrder={sectionOrder}
          />
        ) : (
          <p className="mt-5 text-sm text-slate-600">No structured content saved for this material.</p>
        )}
        {saveError ? <p className="mt-3 text-sm text-rose-700">{saveError}</p> : null}
        {copyState === "error" ? <p className="mt-3 text-sm text-rose-700">Could not copy material.</p> : null}
      </article>
      {editingSection ? (
        <section className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-lg font-semibold text-[#1F2937]">Edit section · {editingSection.title}</h3>
              <button type="button" onClick={() => setEditingSection(null)} className="rounded-xl border border-rose-100 p-2 text-slate-600">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {editingSection.helper ? <p className="mt-3 text-sm text-slate-600">{editingSection.helper}</p> : null}
            <textarea
              value={editingSection.value}
              onChange={(event) => setEditingSection((current) => (current ? { ...current, value: event.target.value } : current))}
              className="mt-3 min-h-64 w-full rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingSection(null)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const lines = editingSection.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean);
                  applySectionEdit(editingSection.id, lines);
                  setEditingSection(null);
                  showToast({ type: "success", title: "Section updated" });
                }}
                className="rounded-xl bg-[#FF4F7B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
              >
                Save
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {addingSection ? (
        <section className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-lg font-semibold text-[#1F2937]">Add section</h3>
              <button type="button" onClick={() => setAddingSection(false)} className="rounded-xl border border-rose-100 p-2 text-slate-600">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-slate-700">Section title</span>
              <input
                value={newSectionTitle}
                onChange={(event) => setNewSectionTitle(event.target.value)}
                placeholder="e.g. Main Discussion, Business Scenarios, Advanced Expressions"
                className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-slate-700">Section content (one line per item)</span>
              <textarea
                value={newSectionContent}
                onChange={(event) => setNewSectionContent(event.target.value)}
                className="mt-2 min-h-56 w-full rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAddingSection(false)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={addSection}
                className="rounded-xl bg-[#FF4F7B] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
              >
                Save
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FullMaterial({
  content,
  materialType,
  level,
  editable = false,
  selectable = false,
  selectedSectionIds = [],
  onToggleSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDropOn,
  draggedSectionId,
  dragOverSectionId,
  sectionOrder = []
}: {
  content: GeneratedMaterialContent;
  materialType: string;
  level: string;
  editable?: boolean;
  selectable?: boolean;
  selectedSectionIds?: string[];
  onToggleSelect?: (id: string) => void;
  onEdit?: (id: string, title: string, items: string[], helper?: string) => void;
  onDelete?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (id: string) => void;
  onDropOn?: (id: string) => void;
  draggedSectionId?: string | null;
  dragOverSectionId?: string | null;
  sectionOrder?: string[];
}) {
  const isSimpleConversationSheet = Boolean(content.studentSheet);
  const isSpeakingMaterial = materialType.toLowerCase().includes("speaking");
  const isVocabularyMaterial = materialType.toLowerCase().includes("vocabulary");
  const isQuizMaterial = materialType.toLowerCase().includes("quiz");
  const isRoleplayMaterial = materialType.toLowerCase().includes("roleplay");
  const isListeningMaterial = materialType.toLowerCase().includes("listening");
  return (
    <div className="mt-5 grid gap-4">
      {content.objective ? <Section title="Objective" text={content.objective} /> : null}
      {content.studentSheet ? (
        <section className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-5">
          <header className="border-b border-rose-100 pb-4">
            <h3 className="text-xl font-semibold text-[#1F2937]">🌐 {content.studentSheet.topic}</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1 text-[#FF4F7B]">{level}</span>
              {content.estimatedDuration ? <span className="rounded-full bg-white px-3 py-1 text-slate-700">{content.estimatedDuration}</span> : null}
              <span className="rounded-full bg-white px-3 py-1 text-slate-700">{materialType}</span>
            </div>
          </header>
          <div className="mt-4 space-y-4">
            {isQuizMaterial && content.studentSheet.quizSections?.length ? (
              <>
                <h3 className="font-semibold text-[#1F2937]">🧪 Quiz</h3>
                <div className="space-y-3">
                  {sectionOrder
                    .filter((id) => id.startsWith("quiz-section-"))
                    .map((id) => {
                      const index = Number(id.replace("quiz-section-", ""));
                      const section = content.studentSheet?.quizSections?.[index];
                      if (!section) return null;
                      return (
                        <EditableSection
                          key={id}
                          id={id}
                          title={section.title}
                          items={section.items}
                          editable={editable}
                          selectable={selectable}
                          selected={selectedSectionIds.includes(id)}
                          onToggleSelect={onToggleSelect}
                          onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onDragOver={onDragOver}
                          onDropOn={onDropOn}
                          isDragging={draggedSectionId === id}
                          isDragOver={dragOverSectionId === id}
                        />
                      );
                    })}
                </div>
              </>
            ) : null}

            {isListeningMaterial ? (
              <>
                <h4 className="font-semibold text-[#1F2937]">🎧 Listening Activity</h4>
                <div className="space-y-3">
                  {sectionOrder
                    .filter((id) => id.startsWith("listening-"))
                    .map((id) => {
                      if (id === "listening-transcript") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="Transcript"
                            items={content.studentSheet?.transcript ? [content.studentSheet.transcript] : []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "listening-follow-up") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="Follow-up discussion"
                            items={content.studentSheet?.followUpDiscussion || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "listening-word-bank") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="Word bank"
                            items={content.studentSheet?.wordBank || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id.startsWith("listening-section-")) {
                        const index = Number(id.replace("listening-section-", ""));
                        const section = content.studentSheet?.listeningExercises?.[index];
                        if (!section) return null;
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title={section.title}
                            items={section.items}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id.startsWith("listening-vocabulary-")) {
                        const index = Number(id.replace("listening-vocabulary-", ""));
                        const section = content.studentSheet?.optionalVocabulary?.[index];
                        if (!section) return null;
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title={section.title}
                            items={section.items}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      return null;
                    })}
                </div>
              </>
            ) : null}

            {isVocabularyMaterial ? (
              <>
                <h4 className="font-semibold text-[#1F2937]">🧠 Useful Vocabulary</h4>
                <div className="mt-3 space-y-3">
                  {sectionOrder
                    .filter((id) => id.startsWith("vocabulary-"))
                    .map((id) => {
                      if (id === "vocabulary-main") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="Vocabulary"
                            items={content.studentSheet?.vocabulary || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "vocabulary-phrases") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="👉 Useful phrases"
                            items={content.studentSheet?.usefulPhrases || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id.startsWith("vocabulary-section-")) {
                        const index = Number(id.replace("vocabulary-section-", ""));
                        const section = content.studentSheet?.vocabularySections?.[index];
                        if (!section) return null;
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title={section.title}
                            items={section.items}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      return null;
                    })}
                </div>
              </>
            ) : null}

            {isRoleplayMaterial ? (
              <section className="rounded-2xl bg-white p-4">
                <h3 className="font-semibold text-[#1F2937]">🎭 Roleplay Scenarios</h3>
                <div className="mt-3 space-y-3">
                  {sectionOrder
                    .filter((id) => id.startsWith("roleplay-section-"))
                    .map((id) => {
                      const index = Number(id.replace("roleplay-section-", ""));
                      const scenario = content.studentSheet?.roleplayScenarios?.[index];
                      if (!scenario) return null;
                      return (
                        <EditableSection
                          key={id}
                          id={id}
                          title={scenario.title}
                          items={[scenario.situation, ...safeStringArray(scenario.discuss)]}
                          editable={editable}
                          selectable={selectable}
                          selected={selectedSectionIds.includes(id)}
                          onToggleSelect={onToggleSelect}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          helper="First line is the scenario situation. Next lines are discuss prompts."
                          draggable={editable}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onDragOver={onDragOver}
                          onDropOn={onDropOn}
                          isDragging={draggedSectionId === id}
                          isDragOver={dragOverSectionId === id}
                        />
                      );
                    })}
                </div>
              </section>
            ) : null}

            {isSpeakingMaterial ? (
              <>
                <h4 className="font-semibold text-[#1F2937]">🗣️ Speaking Questions</h4>
                <div className="space-y-3">
                  {sectionOrder
                    .filter((id) => id.startsWith("speaking-"))
                    .map((id) => {
                      if (id === "speaking-easier") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="🟢 Easier Questions"
                            items={content.studentSheet?.easierQuestions || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "speaking-main") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="🔵 Main Discussion"
                            items={content.studentSheet?.mainDiscussionQuestions || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "speaking-deeper") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="🔴 Deeper Discussion"
                            items={content.studentSheet?.deeperDiscussionQuestions || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      if (id === "speaking-fallback") {
                        return (
                          <EditableSection
                            key={id}
                            id={id}
                            title="🔵 Main Discussion"
                            items={content.studentSheet?.speakingQuestions || []}
                            editable={editable}
                            selectable={selectable}
                            selected={selectedSectionIds.includes(id)}
                            onToggleSelect={onToggleSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={editable}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOver={onDragOver}
                            onDropOn={onDropOn}
                            isDragging={draggedSectionId === id}
                            isDragOver={dragOverSectionId === id}
                          />
                        );
                      }
                      return null;
                    })}
                </div>
              </>
            ) : null}
            {content.studentSheet ? (
              <div className="space-y-3">
                {getUnknownStudentSheetSections(content.studentSheet).map((section) => (
                  <EditableSection
                    key={section.id}
                    id={section.id}
                    title={section.title}
                    items={section.items}
                    editable={editable}
                    selectable={selectable}
                    selected={selectedSectionIds.includes(section.id)}
                    onToggleSelect={onToggleSelect}
                    onEdit={onEdit}
                            onDelete={onDelete}
                            draggable={false}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      {content.teacherNotes ? (
        <section className="rounded-2xl bg-[#FFF5F8] p-4">
          <h3 className="font-semibold text-[#1F2937]">Teacher Notes</h3>
          <ListSection title="Correction focus" items={content.teacherNotes.correctionFocus} />
          <ListSection title="Follow-up ideas" items={content.teacherNotes.followUpIdeas} />
          <ListSection title="Conversation expansion" items={content.teacherNotes.conversationExpansion} />
          <ListSection title="Possible issues" items={content.teacherNotes.possibleIssues} />
        </section>
      ) : null}
      {!isSimpleConversationSheet ? <ListSection title="Teacher instructions" items={content.teacherInstructions || []} /> : null}
      {!isSimpleConversationSheet ? <ListSection title="Student instructions" items={content.studentInstructions || []} /> : null}
      {!isSimpleConversationSheet ? <ListSection title="Activities" items={content.activities?.length ? content.activities : content.activitySteps || []} /> : null}
      {!isSimpleConversationSheet ? <ListSection title="Speaking prompts" items={content.speakingPrompts || []} /> : null}
      {!isSimpleConversationSheet ? <ListSection title="Corrections focus" items={content.correctionsFocus || []} /> : null}
      {!isSimpleConversationSheet ? (
        <section className="rounded-2xl bg-[#FFF5F8] p-4">
          <h3 className="font-semibold text-[#1F2937]">Vocabulary focus</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {content.vocabulary.map((item) => (
              <li key={`${item.term}-${item.task}`}>
                <span className="font-semibold">{item.term}:</span> {item.task}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!isSimpleConversationSheet ? <ListSection title="Follow-up questions" items={content.followUpQuestions || []} /> : null}
      {!isSimpleConversationSheet && content.homeworkSuggestion ? <Section title="Homework" text={content.homeworkSuggestion} /> : null}
    </div>
  );
}

function EditableSection({
  id,
  title,
  items,
  editable,
  selectable,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  helper,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDropOn,
  isDragging = false,
  isDragOver = false
}: {
  id: string;
  title: string;
  items: string[];
  editable: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit?: (id: string, title: string, items: string[], helper?: string) => void;
  onDelete?: (id: string) => void;
  helper?: string;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (id: string) => void;
  onDropOn?: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section
      onClick={() => {
        if (selectable) onToggleSelect?.(id);
      }}
      draggable={draggable}
      onDragStart={() => onDragStart?.(id)}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(event) => {
        if (!draggable) return;
        event.preventDefault();
        onDragOver?.(id);
      }}
      onDrop={(event) => {
        if (!draggable) return;
        event.preventDefault();
        onDropOn?.(id);
      }}
      className={`relative rounded-xl border p-3 transition-[transform,box-shadow,border-color,background-color,opacity] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        selected ? "border-[#FF4F7B] bg-rose-50 shadow-sm" : "border-rose-100 bg-white hover:border-rose-200"
      } ${selectable ? "cursor-pointer" : ""} ${isDragging ? "scale-[1.01] opacity-90 shadow-lg" : ""}`}
    >
      {isDragOver ? <div className="absolute left-3 right-3 top-0 h-1 rounded-full bg-[#FF4F7B]/70" /> : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {draggable ? (
            <span className={`rounded-md border border-rose-200 bg-white p-1 text-slate-500 ${isDragOver ? "border-[#FF4F7B] text-[#FF4F7B]" : ""}`}>
              <GripVertical size={12} aria-hidden="true" />
            </span>
          ) : null}
          <h4 className="font-semibold text-[#1F2937]">{title}</h4>
          {selected ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-[#E63E69]">Selected</span> : null}
          {isDragging ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Dragging</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {editable ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(id, title, items, helper);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <Pencil size={12} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete?.(id);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
              >
                <Trash2 size={12} aria-hidden="true" />
                Delete
              </button>
            </>
          ) : null}
          {selectable ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect?.(id);
              }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                selected ? "border-[#FF4F7B] bg-rose-100 text-[#E63E69]" : "border-rose-200 bg-white text-slate-700"
              }`}
            >
              {selected ? <CheckSquare2 size={12} aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
              {selected ? "Selected" : "Select"}
            </button>
          ) : null}
        </div>
      </div>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

function getRenderableSectionIds(materialType: string, content: GeneratedMaterialContent | null) {
  if (!content?.studentSheet) return [];
  const type = materialType.toLowerCase();
  const ids: string[] = [];

  if (type.includes("vocabulary")) {
    (content.studentSheet.vocabularySections || []).forEach((_, index) => ids.push(`vocabulary-section-${index}`));
    if ((content.studentSheet.vocabulary || []).length) ids.push("vocabulary-main");
    if ((content.studentSheet.usefulPhrases || []).length) ids.push("vocabulary-phrases");
    return ids;
  }

  if (type.includes("speaking")) {
    if ((content.studentSheet.easierQuestions || []).length) ids.push("speaking-easier");
    if ((content.studentSheet.mainDiscussionQuestions || []).length) ids.push("speaking-main");
    if ((content.studentSheet.deeperDiscussionQuestions || []).length) ids.push("speaking-deeper");
    if (
      !(content.studentSheet.easierQuestions || []).length &&
      !(content.studentSheet.mainDiscussionQuestions || []).length &&
      !(content.studentSheet.deeperDiscussionQuestions || []).length &&
      (content.studentSheet.speakingQuestions || []).length
    ) {
      ids.push("speaking-fallback");
    }
    return ids;
  }

  if (type.includes("quiz")) {
    (content.studentSheet.quizSections || []).forEach((_, index) => ids.push(`quiz-section-${index}`));
    return ids;
  }

  if (type.includes("roleplay")) {
    (content.studentSheet.roleplayScenarios || []).forEach((_, index) => ids.push(`roleplay-section-${index}`));
    return ids;
  }

  if (type.includes("listening")) {
    if (content.studentSheet.transcript) ids.push("listening-transcript");
    (content.studentSheet.optionalVocabulary || []).forEach((_, index) => ids.push(`listening-vocabulary-${index}`));
    (content.studentSheet.listeningExercises || []).forEach((_, index) => ids.push(`listening-section-${index}`));
    if ((content.studentSheet.wordBank || []).length) ids.push("listening-word-bank");
    if ((content.studentSheet.followUpDiscussion || []).length) ids.push("listening-follow-up");
    return ids;
  }

  return ids;
}

function reconcileSectionOrder(current: string[], availableIds: string[]) {
  const existing = current.filter((id) => availableIds.includes(id));
  const missing = availableIds.filter((id) => !existing.includes(id));
  return [...existing, ...missing];
}

function getUnknownStudentSheetSections(studentSheet: NonNullable<GeneratedMaterialContent["studentSheet"]>) {
  const knownKeys = new Set([
    "topic",
    "levelLabel",
    "statusLabel",
    "skillLabel",
    "vocabulary",
    "usefulPhrases",
    "speakingQuestions",
    "easierQuestions",
    "mainDiscussionQuestions",
    "deeperDiscussionQuestions",
    "deeperDiscussionQuestion",
    "optionalRoleplayScenario",
    "optionalRoleplayQuestions",
    "roleplayScenarios",
    "vocabularySections",
    "quizSections",
    "transcript",
    "listeningExercises",
    "wordBank",
    "followUpDiscussion",
    "optionalVocabulary"
  ]);

  return Object.entries(studentSheet)
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, value]) => {
      const title = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
      const items = normalizeUnknownValue(value);
      return { id: `custom-${key}`, title, items };
    })
    .filter((section) => section.items.length > 0);
}

function normalizeUnknownValue(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value && typeof value === "object") return [JSON.stringify(value, null, 2)];
  return [];
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl bg-[#FFF5F8] p-4">
      <h3 className="font-semibold text-[#1F2937]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}

function ListSection({ title, items }: { title?: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl bg-[#FFF5F8] p-4">
      {title ? <h3 className="font-semibold text-[#1F2937]">{title}</h3> : null}
      <ol className={`${title ? "mt-3 " : ""}space-y-2 text-sm leading-6 text-slate-700`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center text-slate-600">
      <Search className="mx-auto mb-3 text-[#FF4F7B]" size={28} aria-hidden="true" />
      <h2 className="text-lg font-semibold text-[#1F2937]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6">{text}</p>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  optionLabels = {},
  compact = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  optionLabels?: Record<string, string>;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className={compact ? "sr-only" : "text-sm font-semibold text-slate-700"}>{label}</span>
      <AppSelect
        value={value}
        onChange={onChange}
        options={options.map((option) => ({ value: option, label: optionLabels[option] || option }))}
        className={compact ? "" : "mt-2"}
      />
    </label>
  );
}

function MultiFilter({
  label,
  values,
  onChange,
  options,
  emptyText = "No options yet.",
  className = ""
}: {
  label: string;
  values: string[] | null | undefined;
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  emptyText?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedValues = Array.isArray(values) ? values : [];
  const safeOptions = Array.isArray(options) ? options.filter((option) => option.value) : [];
  const selectedLabel = selectedValues.length === 0 ? label : `${label} · ${selectedValues.length}`;

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  function toggle(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
          selectedValues.length
            ? "border-[#FF4F7B] bg-[#FFF5F8] text-[#E63E69]"
            : "border-rose-100 bg-white text-slate-700 hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
        }`}
        aria-expanded={open}
      >
        {selectedLabel}
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-72 rounded-2xl border border-rose-100 bg-white p-2 shadow-[0_18px_34px_rgba(15,23,42,0.16)]">
          <div className="max-h-64 overflow-auto pr-1">
            {safeOptions.length ? safeOptions.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  aria-pressed={selected}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected ? "bg-[#FFF5F8] font-semibold text-[#E63E69]" : "text-slate-700 hover:bg-rose-50"
                  }`}
                >
                  <span>{option.label}</span>
                  {selected ? <CheckSquare2 size={15} aria-hidden="true" /> : <Square size={15} className="text-slate-300" aria-hidden="true" />}
                </button>
              );
            }) : <p className="px-3 py-4 text-sm leading-5 text-slate-500">{emptyText}</p>}
          </div>
          {selectedValues.length ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-2 w-full rounded-xl border border-rose-100 px-3 py-2 text-xs font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
            >
              Clear {label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-[#FFF5F8] px-2.5 py-1 text-[11px] font-semibold text-[#E63E69]">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full text-[#E63E69] transition hover:text-[#1F2937]" aria-label={`Remove ${label}`}>
        <X size={13} aria-hidden="true" />
      </button>
    </span>
  );
}

function TagEditor({
  tags,
  onSave,
  compact = false
}: {
  tags: string[];
  onSave: (tags: string[]) => void | Promise<void>;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const safeTags = normalizeUserTags(tags);

  async function addTag() {
    const nextTag = value.trim();
    if (!nextTag) return;
    await onSave(normalizeUserTags([...safeTags, nextTag]));
    setValue("");
  }

  async function removeTag(tag: string) {
    await onSave(safeTags.filter((item) => item !== tag));
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="flex flex-wrap gap-1.5">
        {safeTags.length ? (
          safeTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-rose-100">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 transition hover:text-[#FF4F7B]" aria-label={`Remove tag ${tag}`}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">No tags yet. Add tags to organize materials.</span>
        )}
      </div>
      <div className="mt-2 flex max-w-sm gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag"
          className="min-w-0 flex-1 rounded-xl border border-rose-100 px-3 py-2 text-xs text-[#1F2937] outline-none focus:border-[#FF4F7B] focus:ring-2 focus:ring-rose-100"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-xl bg-[#FF4F7B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E63E69]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function getUserTagsForMaterial(material: TeachingMaterial, overrides: Record<string, string[]>) {
  return overrides[material.id] || getMaterialUserTags(material.content);
}

function getMaterialUserTags(content: GeneratedMaterialContent | null | undefined) {
  return normalizeUserTags(content?.userTags || []);
}

function normalizeUserTags(tags: string[]) {
  return Array.from(new Set((Array.isArray(tags) ? tags : []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
}

function createMinimalMaterialContent(material: TeachingMaterial): GeneratedMaterialContent {
  return {
    title: material.title,
    objective: material.summary || "",
    vocabulary: [],
    studentSheet: {
      topic: material.topic || material.title,
      vocabulary: [],
      usefulPhrases: [],
      speakingQuestions: []
    }
  };
}
