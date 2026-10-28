import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Cookie Policy | LessonFlow",
  description: "LessonFlow Cookie Policy."
};

export default async function CookiesPage() {
  const html = fs.readFileSync(path.join(process.cwd(), "src/content/legal/cookie-policy.html"), "utf8");

  return (
    <LegalPageShell label="Cookie Policy" title="LessonFlow Cookie Policy">
      <div
        className="legal-termly-content overflow-x-auto rounded-2xl border border-rose-100 bg-white p-4 text-sm leading-7 text-slate-700 md:p-6"
        // Trusted static Termly export stored in the repository. Do not replace with user-provided HTML.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </LegalPageShell>
  );
}
