import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    // Supabase SSR callback: exchange the provider code for a Supabase session cookie.
    // Google redirects to Supabase first; Supabase then sends the browser back here via `redirectTo`.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      // Keep the app profile table aligned with the authenticated Supabase user.
      // Secrets stay in Supabase/Google/Vercel; this route only stores safe user metadata.
      const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email";
      const metadata = user.user_metadata ?? {};
      const fullName =
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : "";
      const avatarUrl =
        typeof metadata.avatar_url === "string"
          ? metadata.avatar_url
          : typeof metadata.picture === "string"
            ? metadata.picture
            : "";

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          email: user.email ?? "",
          avatar_url: avatarUrl,
          auth_provider: provider
        },
        { onConflict: "id" }
      );

      if (profileError && process.env.NODE_ENV === "development") {
        console.warn("[auth.callback] profile sync failed", {
          message: profileError.message,
          code: profileError.code,
          userId: user.id,
          provider
        });
      }
    }
  }

  redirect("/dashboard");
}
