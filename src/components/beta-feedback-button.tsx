"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";

const feedbackCategories = ["Bug", "Improvement", "Missing Feature", "General Feedback"] as const;

type FeedbackCategory = (typeof feedbackCategories)[number];

export function BetaFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("General Feedback");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canSend = message.trim().length >= 8;

  function closeModal() {
    setIsOpen(false);
  }

  async function handleSend() {
    if (!canSend) {
      showToast({ type: "error", title: "Add a little more detail", description: "Please write at least a short sentence before sending." });
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
          page: window.location.pathname
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not send feedback.");
      }
      setMessage("");
      setCategory("General Feedback");
      closeModal();
      showToast({ type: "success", title: "Thank you for your feedback." });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Could not send feedback.";
      showToast({ type: "error", title: "Feedback failed", description });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        data-testid="feedback-button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
      >
        <MessageCircle size={16} aria-hidden="true" />
        Send Feedback
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF4F7B]">Beta feedback</p>
                <h2 id="feedback-title" className="mt-1 text-xl font-semibold text-[#1F2937]">
                  Help improve LessonFlow
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Send structured feedback directly to the LessonFlow team.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-rose-100 p-2 text-slate-500 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
                aria-label="Close feedback form"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
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

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="send-feedback"
                onClick={handleSend}
                disabled={!canSend || isSending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={16} aria-hidden="true" />
                {isSending ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
