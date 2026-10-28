import type { TeachingMaterial, TeachingStudent } from "@/lib/teaching-types";

type GeneratedMaterialsPanelProps = {
  materials: TeachingMaterial[];
  student?: TeachingStudent;
};

export function GeneratedMaterialsPanel({ materials, student }: GeneratedMaterialsPanelProps) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const preferredTopics = Array.isArray(student?.preferredTopics) ? student.preferredTopics : [];
  const interests = Array.isArray(student?.interests) ? student.interests : [];
  const lessonHistory = Array.isArray(student?.lessonHistory) ? student.lessonHistory : [];
  const recommendations = student
    ? safeMaterials
        .filter((material) => material.level === student.level || material.metadata?.level === student.level)
        .filter((material) => {
          const haystack = [
            material.topic,
            material.metadata?.topic,
            material.metadata?.subtopic,
            ...(material.metadata?.keywords || []),
            ...(material.metadata?.vocabularyThemes || [])
          ]
            .join(" ")
            .toLowerCase();
          return [...preferredTopics, ...interests, ...lessonHistory.map((lesson) => lesson.topic || lesson.title)]
            .filter(Boolean)
            .some((topic) => haystack.includes(topic.toLowerCase()) || topic.toLowerCase().includes(material.topic.toLowerCase()));
        })
        .slice(0, 3)
    : [];

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">Generated materials</h2>
          <p className="mt-1 text-sm text-slate-600">Previously used materials and reusable assets for this student.</p>
        </div>
      </div>
      {recommendations.length ? (
        <div className="mt-4 rounded-2xl bg-[#FFF5F8] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF4F7B]">Recommended from history</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendations.map((material) => (
              <span key={material.id} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                {material.metadata?.skills?.[0] || material.skill}: {material.topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {safeMaterials.map((material) => (
          <article key={material.id} className="rounded-2xl bg-[#FFF5F8] p-4">
            <p className="font-semibold text-[#1F2937]">{material.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{material.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-xl bg-white px-2 py-1 text-[#FF4F7B]">{material.level}</span>
              <span className="rounded-xl bg-white px-2 py-1 text-[#FF4F7B]">{material.metadata?.skills?.[0] || material.skill}</span>
              <span className="rounded-xl bg-white px-2 py-1 text-slate-600">{material.metadata?.topic || material.topic}</span>
              <span className="rounded-xl bg-white px-2 py-1 text-slate-600">{material.metadata?.materialType || material.exerciseType}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
