import { BookOpen, MessageCircle, NotebookPen, Sparkles } from "lucide-react";
import type { LessonContent } from "@/lib/types";
import { ExportPdfButton } from "./export-pdf-button";

type GenerationResultProps = {
  content: LessonContent;
  cefrLevel: string;
  createdAt?: string;
};

export function GenerationResult({ content, cefrLevel, createdAt }: GenerationResultProps) {
  return (
    <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">{cefrLevel}</p>
          <h2 className="text-xl font-semibold text-[#1F2937]">Lesson pack</h2>
        </div>
        <ExportPdfButton content={content} cefrLevel={cefrLevel} createdAt={createdAt} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={<Sparkles size={18} />} title="Warm-up questions" items={content.warmUpQuestions} />
        <Section icon={<BookOpen size={18} />} title="Vocabulary" items={content.vocabulary.map((item) => `${item.term}: ${item.definition} Example: ${item.example}`)} />
        <Section icon={<MessageCircle size={18} />} title="Comprehension questions" items={content.comprehensionQuestions} />
        <div className="space-y-5">
          <TextBlock icon={<MessageCircle size={18} />} title="Speaking task" text={content.speakingTask} />
          <TextBlock icon={<NotebookPen size={18} />} title="Homework" text={content.homework} />
        </div>
      </div>
    </article>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        <span className="text-rose-600">{icon}</span>
        {title}
      </h3>
      <ol className="space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
            <li key={item} className="rounded-2xl bg-[#FFF5F8] px-3 py-2">
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}

function TextBlock({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        <span className="text-indigo-600">{icon}</span>
        {title}
      </h3>
      <p className="rounded-2xl bg-[#FFF5F8] px-3 py-3 text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}
