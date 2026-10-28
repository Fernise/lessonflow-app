"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/toast-provider";
import { prepareWeekActionState, type PrepareWeekActionState } from "./actions";

const initialState: PrepareWeekActionState = {};

export function PrepareWeekForm({ weekStart }: { weekStart: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(prepareWeekActionState, initialState);

  useEffect(() => {
    if (state.ok && state.weekStart) {
      showToast({ type: "success", title: "Week prepared", description: "Checklist and suggestions were updated." });
      router.push(`/weekly-prep?week=${state.weekStart}`);
      router.refresh();
    } else if (state.error) {
      showToast({ type: "error", title: "Could not prepare week", description: state.error });
    }
  }, [router, state.error, state.ok, state.weekStart]);

  return (
    <form action={formAction} className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Selected week</span>
        <input
          type="date"
          name="weekStart"
          defaultValue={weekStart}
          className="mt-2 w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-[#FF4F7B] focus:ring-2"
        />
      </label>
      <SubmitButton />
      {state.error ? <p className="mt-2 text-xs font-medium text-rose-700">{state.error}</p> : null}
      {state.ok ? <p className="mt-2 text-xs font-medium text-emerald-700">Preparation saved.</p> : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      data-testid="prepare-my-week"
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
    >
      <Sparkles size={16} aria-hidden="true" />
      {pending ? "Preparing..." : "Prepare my week"}
    </button>
  );
}
