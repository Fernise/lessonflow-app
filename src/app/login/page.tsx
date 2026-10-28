import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#FFF5F8]">
      <AppHeader />
      <section className="page-shell grid min-h-[calc(100vh-64px)] items-center gap-10 py-12 lg:grid-cols-[1fr,420px]">
        <div>
          <p className="mb-4 w-fit rounded-xl bg-white px-3 py-1 text-sm font-semibold text-[#FF4F7B] shadow-sm">
            Secure teacher workspace
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-[#1F2937] md:text-5xl">
            Generate, save, and export lesson packs.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
            Sign in to keep every generation tied to your account and ready for the next class.
          </p>
        </div>
        <AuthForm initialMessage={query?.error ?? null} />
      </section>
    </main>
  );
}
