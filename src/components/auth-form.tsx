"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  initialMessage?: string | null;
};

export function AuthForm({ initialMessage = null }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const authCall =
        mode === "login"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
            });

      const { error } = await authCall;
      if (error) {
        setMessage(error.message);
        return;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect. Please try again.");
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (mode === "signup") {
      setMessage("Check your inbox if email confirmation is enabled.");
    }

    router.refresh();
    router.push(mode === "signup" ? "/onboarding" : "/dashboard");
  }

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    setMessage(null);

    try {
      const appCallbackUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Supabase starts the provider OAuth flow, then returns to this app URL.
          // Keeping this on the LessonFlow origin avoids sending users back to a raw Supabase URL after auth.
          redirectTo: appCallbackUrl
        }
      });

      if (error) {
        setMessage(error.message);
        setIsGoogleSubmitting(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect to Google. Please try again.");
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-6 shadow-soft">
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#FFF5F8] p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "login" ? "bg-white text-[#1F2937] shadow-sm" : "text-slate-600"
          }`}
        >
          <LogIn size={16} aria-hidden="true" />
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "signup" ? "bg-white text-[#1F2937] shadow-sm" : "text-slate-600"
          }`}
        >
          <UserPlus size={16} aria-hidden="true" />
          Sign up
        </button>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleSubmitting || isSubmitting}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-sm transition hover:border-[#FF4F7B]/40 hover:bg-[#FFF5F8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGoogleSubmitting ? (
          <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        ) : (
          <GoogleMark />
        )}
        {isGoogleSubmitting ? "Connecting..." : "Continue with Google"}
      </button>

      <div className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
        <span className="h-px flex-1 bg-rose-100" />
        or
        <span className="h-px flex-1 bg-rose-100" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-[#1F2937] outline-none ring-[#FF4F7B] transition focus:ring-2"
          />
        </label>
        {message ? <p className="text-sm text-rose-700">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting || isGoogleSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2.5 font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {mode === "login" ? <LogIn size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
          {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
