"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";
import { Plus, Save, X } from "lucide-react";
import { cefrLevels } from "@/lib/types";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";
import type { SpeakingConfidence, TeachingStudent } from "@/lib/teaching-types";
import type { StudentFormState } from "@/lib/supabase/teaching-data";

type StudentFormProps = {
  action: (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;
  student?: TeachingStudent;
  submitLabel: string;
};

const confidenceOptions: SpeakingConfidence[] = ["Low", "Developing", "Confident", "Advanced"];
const lessonCountOptions = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20"];
const lessonPeriodOptions = ["per week", "every 2 weeks", "every 3 weeks", "per month"];
const goalSuggestions = ["Improve fluency", "Business English", "IELTS", "Cambridge", "Job Interviews", "Pronunciation", "Grammar accuracy"];
const interestSuggestions = ["Technology", "Travel", "Finance", "Sports", "Business", "Food", "Culture", "Startups"];
const topicSuggestions = ["AI", "Remote Work", "Social Media", "Hiring", "Meetings", "Technology Addiction", "Digital Privacy"];

export function StudentForm({ action, student, submitLabel }: StudentFormProps) {
  const [state, formAction] = useFormState(action, {});

  useEffect(() => {
    if (state.error) {
      showToast({ type: "error", title: "Student could not be saved", description: state.error });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-5 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}

      <section>
        <p className="text-sm font-semibold text-[#FF4F7B]">Basic info</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Name" name="name" defaultValue={student?.name} required />
          <Select label="Level" name="level" defaultValue={student?.level || "B1"} options={cefrLevels} />
          <Field label="Native language" name="nativeLanguage" defaultValue={student?.nativeLanguage} />
          <LessonFrequencyField defaultValue={student?.lessonFrequency} />
        </div>
        <TagInput label="Goals" name="goals" defaultTags={student?.goals || []} suggestions={goalSuggestions} />
        <TagInput label="Interests" name="interests" defaultTags={student?.interests || []} suggestions={interestSuggestions} />
        <TextArea label="Profile notes" name="notes" defaultValue={student?.notes} />
      </section>

      <section>
        <p className="text-sm font-semibold text-[#FF4F7B]">Teaching memory</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea label="Recurring mistakes" name="recurringMistakes" defaultValue={student?.recurringMistakes.join("\n")} />
          <TextArea label="Grammar weaknesses" name="grammarWeaknesses" defaultValue={student?.grammarWeaknesses.join("\n")} />
          <TextArea label="Vocabulary to review" name="vocabularyToReview" defaultValue={student?.vocabularyToReview.join("\n")} />
          <TextArea label="Pronunciation notes" name="pronunciationNotes" defaultValue={student?.pronunciationNotes.join("\n")} />
          <Select
            label="Speaking confidence"
            name="speakingConfidence"
            defaultValue={student?.speakingConfidence || "Developing"}
            options={confidenceOptions}
          />
          <TextArea label="Listening weaknesses" name="listeningWeaknesses" defaultValue={student?.listeningWeaknesses.join("\n")} />
          <TagInput label="Preferred topics" name="preferredTopics" defaultTags={student?.preferredTopics || []} suggestions={topicSuggestions} compact />
          <TextArea label="Avoided topics" name="avoidedTopics" defaultValue={student?.avoidedTopics.join("\n")} />
          <TextArea label="Repeated topics" name="repeatedTopics" defaultValue={student?.repeatedTopics.join("\n")} />
          <TextArea label="Strengths" name="strengths" defaultValue={student?.strengths.join("\n")} />
        </div>
        {student ? (
          <>
            <TextArea label="Notes for next class" name="notesForNextClass" defaultValue={student.notesForNextClass} />
            <TextArea label="Next suggested focus" name="nextSuggestedFocus" defaultValue={student.nextSuggestedFocus} />
          </>
        ) : (
          <>
            <input type="hidden" name="notesForNextClass" value="" />
            <input type="hidden" name="nextSuggestedFocus" value="" />
          </>
        )}
      </section>

      <SubmitButton submitLabel={submitLabel} />
    </form>
  );
}

function LessonFrequencyField({ defaultValue = "" }: { defaultValue?: string }) {
  const parsed = parseLessonFrequency(defaultValue);
  const [count, setCount] = useState(parsed.count);
  const [period, setPeriod] = useState(parsed.period);
  const value = `${count} ${period}`;

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">Lesson frequency</span>
      <input type="hidden" name="lessonFrequency" value={value} />
      <div className="mt-2 grid grid-cols-[96px,1fr] gap-2">
        <AppSelect value={count} onChange={setCount} options={lessonCountOptions.map((item) => ({ value: item, label: item }))} />
        <AppSelect value={period} onChange={setPeriod} options={lessonPeriodOptions.map((item) => ({ value: item, label: item }))} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Example: {value}</p>
    </label>
  );
}

function TagInput({
  label,
  name,
  defaultTags,
  suggestions,
  compact = false
}: {
  label: string;
  name: string;
  defaultTags: string[];
  suggestions: string[];
  compact?: boolean;
}) {
  const [tags, setTags] = useState(() => uniqueTags(defaultTags));
  const [draft, setDraft] = useState("");
  const availableSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase())),
    [suggestions, tags]
  );

  function addTag(value = draft) {
    const next = value.trim();
    if (!next) return;
    setTags((current) => uniqueTags([...current, next]));
    setDraft("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  return (
    <div className={`${compact ? "" : "mt-4"} block`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
      <div className="mt-2 rounded-2xl border border-rose-100 bg-white p-3 focus-within:ring-2 focus-within:ring-[#FF4F7B]">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-[#1F2937]">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 transition hover:text-[#E63E69]" aria-label={`Remove ${tag}`}>
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag();
              }
              if (event.key === "Backspace" && !draft && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm text-[#1F2937] outline-none"
            placeholder={tags.length ? "Add another..." : `Add ${label.toLowerCase()}...`}
            list={`${name}-suggestions`}
          />
          <button
            type="button"
            onClick={() => addTag()}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-2 py-1 text-xs font-semibold text-[#FF4F7B] transition hover:border-[#FF4F7B]"
          >
            <Plus size={13} aria-hidden="true" />
            Add
          </button>
        </div>
      </div>
      <datalist id={`${name}-suggestions`}>
        {availableSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      {availableSuggestions.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSuggestions.slice(0, 7).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="rounded-full border border-rose-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function parseLessonFrequency(value: string) {
  const normalized = value.trim().toLowerCase();
  const count = lessonCountOptions.find((item) => normalized.startsWith(item)) || "1";
  const period = lessonPeriodOptions.find((item) => normalized.includes(item)) || "per week";
  return { count, period };
}

function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function SubmitButton({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      <Save size={17} aria-hidden="true" />
      {pending ? "Saving..." : submitLabel}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  required = false
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <AppSelect
        name={name}
        defaultValue={defaultValue}
        options={options.map((option) => ({ value: option, label: option }))}
        className="mt-2"
      />
    </label>
  );
}

function TextArea({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
      />
    </label>
  );
}
