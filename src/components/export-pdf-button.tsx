"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { LessonContent } from "@/lib/types";

type ExportPdfButtonProps = {
  content: LessonContent;
  cefrLevel: string;
  createdAt?: string;
};

export function ExportPdfButton({ content, cefrLevel, createdAt }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function exportPdf() {
    setIsExporting(true);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    const addLine = (text: string, fontSize = 11, isHeading = false) => {
      doc.setFont("helvetica", isHeading ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, width);
      const lineHeight = fontSize + 5;
      lines.forEach((line: string) => {
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += isHeading ? 6 : 2;
    };

    addLine("LessonFlow Lesson Pack", 18, true);
    addLine(`CEFR level: ${cefrLevel}`);
    if (createdAt) addLine(`Created: ${new Date(createdAt).toLocaleString()}`);
    y += 10;

    addSection("Warm-up questions", content.warmUpQuestions);
    addSection(
      "Vocabulary",
      content.vocabulary.map((item) => `${item.term}: ${item.definition} Example: ${item.example}`)
    );
    addSection("Comprehension questions", content.comprehensionQuestions);
    addSection("Speaking task", [content.speakingTask]);
    addSection("Homework", [content.homework]);

    doc.save(`lessonflow-${cefrLevel}-${Date.now()}.pdf`);
    setIsExporting(false);

    function addSection(title: string, items: string[]) {
      addLine(title, 14, true);
      items.forEach((item, index) => addLine(`${index + 1}. ${item}`));
      y += 8;
    }
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      disabled={isExporting}
      className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B] disabled:cursor-not-allowed disabled:text-slate-400"
    >
      <Download size={16} aria-hidden="true" />
      {isExporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}
