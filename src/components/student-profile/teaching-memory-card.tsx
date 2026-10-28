import { Brain, Headphones, Mic, MessageSquareWarning } from "lucide-react";
import type { TeachingStudent } from "@/lib/teaching-types";

type TeachingMemoryCardProps = {
  student: TeachingStudent;
};

export function TeachingMemoryCard({ student }: TeachingMemoryCardProps) {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#FF4F7B]">Teaching memory</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Patterns to reuse next lesson</h2>
        </div>
        <span className="rounded-xl bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-slate-600">
          Speaking confidence: {student.speakingConfidence}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <MemoryList title="Recurring mistakes" icon={<MessageSquareWarning size={17} />} items={student.recurringMistakes} />
        <MemoryList title="Grammar weaknesses" icon={<Brain size={17} />} items={student.grammarWeaknesses} />
        <MemoryList title="Vocabulary to review" icon={<Brain size={17} />} items={student.vocabularyToReview} />
        <MemoryList title="Pronunciation notes" icon={<Mic size={17} />} items={student.pronunciationNotes} />
        <MemoryList title="Listening weaknesses" icon={<Headphones size={17} />} items={student.listeningWeaknesses} />
        <MemoryList title="Preferred topics" icon={<Brain size={17} />} items={student.preferredTopics} />
        <MemoryList title="Avoided/repeated topics" icon={<Brain size={17} />} items={[...student.avoidedTopics, ...student.repeatedTopics]} />
        <MemoryList title="Strengths" icon={<Brain size={17} />} items={student.strengths} />
        <div className="rounded-2xl bg-[#FFF5F8] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
            <Brain size={17} className="text-[#FF4F7B]" aria-hidden="true" />
            Teacher notes
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">{student.notesForNextClass || student.notes || "No notes yet."}</p>
          {student.memoryItems.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {student.memoryItems.slice(0, 8).map((item) => (
                <span key={item.id} className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {item.category}: {item.content}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MemoryList({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <article className="rounded-2xl bg-[#FFF5F8] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1F2937]">
        <span className="text-[#FF4F7B]">{icon}</span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-5 text-slate-500">No items yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-xl bg-white px-3 py-2 text-sm leading-5 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
