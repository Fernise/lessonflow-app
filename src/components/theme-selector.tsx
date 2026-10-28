"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/toast-provider";

const themes = [
  { id: "coral", label: "Coral" },
  { id: "soft-light", label: "Soft light" },
  { id: "high-contrast", label: "High contrast" }
] as const;

type ThemeId = (typeof themes)[number]["id"];

const themeStorageKey = "lessonflow-theme";

export function ThemeSelector() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("coral");

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as ThemeId | null) || "coral";
    setActiveTheme(current);
  }, []);

  function applyTheme(theme: ThemeId) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeStorageKey, theme);
    setActiveTheme(theme);
    showToast({ type: "success", title: "Theme updated" });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {themes.map((theme) => {
        const selected = activeTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={selected}
            onClick={() => applyTheme(theme.id)}
            className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${
              selected ? "border-[#FF4F7B] bg-[#FFF5F8] text-[#FF4F7B]" : "border-rose-100 bg-white text-slate-700 hover:border-[#FF4F7B]"
            }`}
          >
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
