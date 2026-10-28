"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";

const feedbackCategories = ["Bug", "Improvement", "Missing Feature", "General Feedback"] as const;

type FeedbackCategory = (typeof feedbackCategories)[number];

type FeedbackWorkspaceProps = {
  email: string;
};

export function FeedbackWorkspace({ email }: FeedbackWorkspaceProps) {
  const [category, setCategory] = useState<FeedbackCategory>("General Feedback");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canSend = message.trim().length >= 8;

  useEffect(() => {
    setPage(window.location.pathname);
  }, []);

  async function sendFeedback() {
    if (!canSend) {
      showToast({
        type: "error",
        title: "Add a little more detail",
        description: "Please write at least a short sentence before sending."
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          page
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not send feedback.");
      }
      setMessage("");
      setCategory("General Feedback");
      showToast({ type: "success", title: "Thank you for your feedback." });
    } catch (error) {
      showToast({
        type: "error",
        title: "Feedback failed",
        description: error instanceof Error ? error.message : "Could not send feedback."
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#FF4F7B]">Feedback</p>
        <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Help improve LessonFlow</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Share what feels broken, confusing, missing, or especially useful. Your message is saved with your account and current page.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px,1fr]">
        <label className="block text-sm font-semibold text-[#1F2937]">
          Category
          <AppSelect
            value={category}
            onChange={(value) => setCategory(value as FeedbackCategory)}
            options={feedbackCategories.map((item) => ({ value: item, label: item }))}
            className="mt-2"
          />
        </label>

        <label className="block text-sm font-semibold text-[#1F2937]">
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            placeholder="What happened? What would make LessonFlow more useful for your teaching workflow?"
            className="mt-2 w-full resize-none rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF4F7B] focus:ring-4 focus:ring-rose-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Sending as <span className="font-semibold text-slate-700">{email}</span>
          {page ? <> from <span className="font-semibold text-slate-700">{page}</span></> : null}
        </p>
        <button
          type="button"
          data-testid="send-feedback"
          onClick={sendFeedback}
          disabled={!canSend || isSending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Send size={16} aria-hidden="true" />
          {isSending ? "Sending..." : "Send feedback"}
        </button>
      </div>
    </article>
  );
}
