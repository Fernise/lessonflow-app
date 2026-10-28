"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { showToast } from "@/components/toast-provider";
import { generateWeeklyQuizActionState, type GenerateWeeklyQuizActionState } from "./actions";

const initialState: GenerateWeeklyQuizActionState = {};

export function GenerateQuizButton({
  lessonId,
  weekStart,
  hasRelatedMaterial
}: {
  lessonId: string;
  weekStart: string;
  hasRelatedMaterial: boolean;
}) {
  const [state, formAction] = useFormState(generateWeeklyQuizActionState, initialState);

  useEffect(() => {
    if (state.ok) {
      showToast({
        type: "success",
        title: "Quiz generated",
        description: state.message || "Quiz saved and linked to the lesson."
      });
    } else if (state.error) {
      showToast({
        type: "error",
        title: "Quiz generation failed",
        description: state.error
      });
    }
  }, [state.error, state.message, state.ok]);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="weekStart" value={weekStart} />
      {!hasRelatedMaterial ? (
        <p className="w-full text-xs text-slate-500">
          No related material found. Generate a quiz from the lesson topic instead?
        </p>
      ) : null}
      <SubmitButton hasRelatedMaterial={hasRelatedMaterial} />
    </form>
  );
}

function SubmitButton({ hasRelatedMaterial }: { hasRelatedMaterial: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending
        ? "Generating quiz..."
        : hasRelatedMaterial
          ? "Generate quiz"
          : "Generate from topic"}
    </button>
  );
}
