import type { TeachingStudent } from "@/lib/teaching-types";

export function MemorySummaryCard({ student }: { student: TeachingStudent }) {
  const summary = student.memorySummary;
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#FF4F7B]">Memory Summary</p>
      <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">What should shape the next lesson</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SummaryBlock title="Review next" items={summary.reviewNext} empty="No review items yet" />
        <SummaryBlock title="Avoid repeating" items={summary.avoidRepeating} empty="No avoided topics yet" />
        <SummaryBlock title="Vocabulary to recycle" items={summary.vocabularyToRecycle} empty="No vocabulary saved yet" />
        <SummaryBlock title="Common mistakes" items={summary.commonMistakes} empty="No mistakes saved yet" />
      </div>
      <div className="mt-3 rounded-2xl bg-[#FFF5F8] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested next lesson focus</p>
        <p className="mt-1 text-sm font-semibold text-[#1F2937]">{summary.suggestedNextLessonFocus}</p>
      </div>
    </section>
  );
}

function SummaryBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF5F8] p-4">
      <h3 className="text-sm font-semibold text-[#1F2937]">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {(items.length ? items : [empty]).map((item) => (
          <span key={item} className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
