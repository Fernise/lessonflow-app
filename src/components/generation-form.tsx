"use client";

import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { cefrLevels, type CefrLevel, type LessonGeneration } from "@/lib/types";
import { GenerationResult } from "./generation-result";

type GenerationFormProps = {
  initialGenerations: LessonGeneration[];
};

export function GenerationForm({ initialGenerations }: GenerationFormProps) {
  const [inputText, setInputText] = useState("");
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>("B1");
  const [generations, setGenerations] = useState(initialGenerations);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputText, cefrLevel })
    });

    const payload = await response.json();
    setIsGenerating(false);

    if (!response.ok) {
      setError(payload.error || "Could not generate lesson materials.");
      return;
    }

    setGenerations((current) => [payload.generation, ...current]);
    setInputText("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px),1fr]">
      <form onSubmit={handleSubmit} className="h-fit rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-[#1F2937]">Create lesson materials</h1>
          <p className="mt-1 text-sm text-slate-600">Paste a text or transcript and choose the class level.</p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Text or transcript</span>
          <textarea
            required
            minLength={80}
            maxLength={12000}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            className="mt-1 min-h-72 w-full resize-y rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
            placeholder="Paste source material here..."
          />
        </label>

        <div className="mt-4">
          <span className="text-sm font-medium text-slate-700">CEFR level</span>
          <div className="mt-2 grid grid-cols-4 rounded-2xl bg-[#FFF5F8] p-1">
            {cefrLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCefrLevel(level)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  cefrLevel === level ? "bg-white text-[#1F2937] shadow-sm" : "text-slate-600"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isGenerating}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <WandSparkles size={18} aria-hidden="true" />
          {isGenerating ? "Generating..." : "Generate pack"}
        </button>
      </form>

      <section className="space-y-4">
        {generations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center text-slate-600">
            No saved lesson packs yet.
          </div>
        ) : (
          generations.map((generation) => (
            <GenerationResult
              key={generation.id}
              content={generation.result}
              cefrLevel={generation.cefr_level}
              createdAt={generation.created_at}
            />
          ))
        )}
      </section>
    </div>
  );
}
