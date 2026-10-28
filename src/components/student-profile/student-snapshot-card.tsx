import { BookOpenCheck, Layers3, Target, TrendingUp } from "lucide-react";
import {
  getCompletedLessonsCount,
  getMaterialsUsedCount,
  getRecentlyStudiedTopics,
  getStudentReviewNeeds,
  getSuggestedNextTopics
} from "@/lib/student-memory";
import type { TeachingMaterial, TeachingStudent } from "@/lib/teaching-types";

type StudentSnapshotCardProps = {
  student: TeachingStudent;
  materials: TeachingMaterial[];
};

export function StudentSnapshotCard({ student, materials }: StudentSnapshotCardProps) {
  const recentTopics = getRecentlyStudiedTopics(student);
  const suggestedTopics = getSuggestedNextTopics(student);
  const reviewNeeds = getStudentReviewNeeds(student);
  const studentMaterials = materials.filter((material) => !material.studentId || material.studentId === student.id);

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">Student snapshot</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">What to remember before teaching {student.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A lightweight teaching memory view for goals, recent topics, review needs, and reusable materials.
          </p>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-1 text-sm font-semibold text-[#FF4F7B]">{student.level}</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric icon={<Target size={17} />} label="Goals" value={student.goals.length} />
        <Metric icon={<Layers3 size={17} />} label="Materials used" value={getMaterialsUsedCount(student)} />
        <Metric icon={<BookOpenCheck size={17} />} label="Lessons completed" value={getCompletedLessonsCount(student)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SnapshotBlock title="Goals" items={student.goals} empty="No goals saved yet." />
        <SnapshotBlock title="Interests" items={[...student.interests, ...student.preferredTopics]} empty="No interests saved yet." />
        <SnapshotBlock title="Common mistakes" items={reviewNeeds} empty="No review needs saved yet." />
        <SnapshotBlock title="Recently studied topics" items={recentTopics} empty="No completed lesson topics yet." />
        <SnapshotBlock
          title="Suggested next topics"
          items={suggestedTopics}
          empty="Add interests or lesson history to unlock suggestions."
          accent
        />
        <SnapshotBlock
          title="Reusable materials"
          items={studentMaterials.slice(0, 5).map((material) => `${material.metadata?.materialType || material.exerciseType}: ${material.topic}`)}
          empty="No reusable materials linked yet."
        />
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="rounded-2xl bg-[#FFF5F8] p-4">
      <div className="flex items-center gap-2 text-[#FF4F7B]">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#1F2937]">{value}</p>
    </article>
  );
}

function SnapshotBlock({ title, items, empty, accent = false }: { title: string; items: string[]; empty: string; accent?: boolean }) {
  const safeItems = Array.from(new Set((Array.isArray(items) ? items : []).map((item) => item.trim()).filter(Boolean))).slice(0, 6);
  return (
    <article className="rounded-2xl bg-[#FFF5F8] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
        {accent ? <TrendingUp size={16} className="text-[#FF4F7B]" aria-hidden="true" /> : null}
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {(safeItems.length ? safeItems : [empty]).map((item) => (
          <span
            key={item}
            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
              safeItems.length && accent ? "bg-white text-[#FF4F7B]" : "bg-white text-slate-700"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}
