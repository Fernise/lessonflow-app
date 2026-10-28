import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

type LegalPageShellProps = {
  label: string;
  title: string;
  intro?: string;
  children: ReactNode;
};

export async function LegalPageShell({ label, title, intro, children }: LegalPageShellProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const backHref = user ? "/dashboard" : "/";
  const backLabel = user ? "Back to app" : "Back to home";

  return (
    <main className="min-h-screen bg-[#FFF5F8] text-[#1F2937]">
      <AppHeader
        action={
          <Link href={backHref} className="rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]">
            {backLabel}
          </Link>
        }
      />
      <section className="page-shell py-10">
        <article className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm md:p-8">
          <Link href={backHref} className="text-sm font-semibold text-[#FF4F7B] transition hover:text-[#E63E69]">
            {backLabel}
          </Link>
          <p className="mt-5 text-sm font-semibold text-[#FF4F7B]">{label}</p>
          <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
          {intro ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{intro}</p> : null}
          <div className="mt-8">{children}</div>
        </article>
      </section>
    </main>
  );
}
