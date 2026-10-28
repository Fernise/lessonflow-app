import { Languages, Target } from "lucide-react";
import type { TeachingStudent } from "@/lib/teaching-types";

type BasicInfoCardProps = {
  student: TeachingStudent;
};

export function BasicInfoCard({ student }: BasicInfoCardProps) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">Basic info</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">{student.name}</h2>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-1 text-sm font-semibold text-[#FF4F7B]">
          {student.level}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoTile label="Native language" value={student.nativeLanguage} icon={<Languages size={17} />} />
        <InfoTile label="Lesson frequency" value={student.lessonFrequency} icon={<Target size={17} />} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700">Learning goals</h3>
        <ul className="mt-2 grid gap-2">
          {student.goals.map((goal) => (
            <li key={goal} className="rounded-2xl bg-[#FFF5F8] px-3 py-2 text-sm text-slate-700">
              {goal}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700">Interests and topics</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {student.interests.map((topic) => (
            <span key={topic} className="rounded-xl bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-[#FF4F7B]">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#FFF5F8] p-4">
      <div className="flex items-center gap-2 text-[#FF4F7B]">{icon}</div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-[#1F2937]">{value}</p>
    </div>
  );
}
