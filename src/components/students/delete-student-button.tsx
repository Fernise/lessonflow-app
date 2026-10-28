"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Trash2 } from "lucide-react";
import { showToast } from "@/components/toast-provider";

type DeleteStudentButtonProps = {
  studentId: string;
  compact?: boolean;
  redirectTo?: string;
  onPendingDelete?: () => void;
  onUndoDelete?: () => void;
  onDeleteCommitted?: () => void;
};

export function DeleteStudentButton({
  studentId,
  compact = false,
  redirectTo,
  onPendingDelete,
  onUndoDelete,
  onDeleteCommitted
}: DeleteStudentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  async function commitDelete() {
    if (cancelledRef.current) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not delete student.");
      onDeleteCommitted?.();
      if (redirectTo) router.push(redirectTo as Route);
      router.refresh();
    } catch (error) {
      onUndoDelete?.();
      showToast({
        type: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete student."
      });
    } finally {
      setIsDeleting(false);
      timerRef.current = null;
    }
  }

  return (
    <button
      type="button"
      data-testid="delete-student"
      disabled={isDeleting}
      onClick={() => {
        if (isDeleting || timerRef.current) return;
        onPendingDelete?.();
        cancelledRef.current = false;
        showToast({
          type: "info",
          title: "Student deleted",
          description: "Undo available for 5 seconds.",
          durationMs: 5000,
          actionLabel: "Undo",
          onAction: () => {
            cancelledRef.current = true;
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = null;
            onUndoDelete?.();
            showToast({ type: "success", title: "Student restored" });
          }
        });
        timerRef.current = window.setTimeout(() => {
          void commitDelete();
        }, 5000);
      }}
      className={`flex items-center gap-2 rounded-xl border border-rose-200 bg-white font-semibold text-rose-700 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:text-slate-400 ${
        compact ? "px-3 py-2 text-xs" : "w-full justify-center px-4 py-3 text-sm"
      }`}
    >
      <Trash2 size={16} aria-hidden="true" />
      {isDeleting ? "Deleting..." : "Delete student"}
    </button>
  );
}
