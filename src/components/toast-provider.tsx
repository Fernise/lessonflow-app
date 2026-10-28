"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  title: string;
  description?: string;
  type: ToastType;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

export function showToast(toast: Omit<Toast, "id">) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lessonflow:toast", { detail: toast }));
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<Omit<Toast, "id">>).detail;
      const toast = { ...detail, id: Date.now() + Math.floor(Math.random() * 1000) };
      setToasts((current) => [...current, toast].slice(-8));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, detail.durationMs ?? 5000);
    }

    window.addEventListener("lessonflow:toast", handleToast);
    return () => window.removeEventListener("lessonflow:toast", handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 grid w-[min(380px,calc(100vw-32px))] gap-3">
      {toasts.map((toast) => {
        const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
        return (
          <article key={toast.id} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-2xl transition-all duration-300">
            <div className="flex items-start gap-3">
              <Icon className={toast.type === "error" ? "text-rose-600" : "text-[#FF4F7B]"} size={20} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1F2937]">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p> : null}
                {toast.actionLabel && toast.onAction ? (
                  <button
                    type="button"
                    data-testid={toast.actionLabel.toLowerCase() === "undo" ? "undo-action" : undefined}
                    onClick={() => {
                      toast.onAction?.();
                      setToasts((current) => current.filter((item) => item.id !== toast.id));
                    }}
                    className="mt-2 rounded-lg bg-[#FFF5F8] px-2.5 py-1 text-xs font-semibold text-[#E63E69] transition hover:bg-rose-100"
                  >
                    {toast.actionLabel}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-[#FF4F7B]"
                aria-label="Dismiss notification"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
