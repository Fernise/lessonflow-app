import { Lightbulb, MessageCircle, NotebookPen, Sparkles } from "lucide-react";
import type { AiSuggestions } from "@/lib/teaching-types";

type AiSuggestionsPanelProps = {
  suggestions: AiSuggestions;
};

export function AiSuggestionsPanel({ suggestions }: AiSuggestionsPanelProps) {
  const cards = [
    {
      title: "Suggested next lesson topic",
      value: suggestions.suggestedNextLessonTopic,
      icon: Lightbulb
    },
    {
      title: "Vocabulary to recycle",
      value: suggestions.vocabularyToRecycle.join(", "),
      icon: Sparkles
    },
    {
      title: "Suggested speaking activity",
      value: suggestions.suggestedSpeakingActivity,
      icon: MessageCircle
    },
    {
      title: "Suggested homework",
      value: suggestions.suggestedHomework,
      icon: NotebookPen
    }
  ];

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#FF4F7B]">Mock AI suggestions</p>
        <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Next best teaching moves</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map(({ title, value, icon: Icon }) => (
          <article key={title} className="rounded-2xl bg-[#FFF5F8] p-4">
            <div className="flex items-center gap-2">
              <Icon size={17} className="text-[#FF4F7B]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[#1F2937]">{title}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
