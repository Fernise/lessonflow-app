import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  assertAnonKey(key);

  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components cannot set cookies; middleware refreshes sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Components cannot set cookies; middleware refreshes sessions.
          }
        }
      }
    }
  );
}

function assertAnonKey(key: string) {
  const payload = decodeJwtPayload(key);
  if (payload?.role === "service_role") {
    throw new Error("Invalid Supabase client configuration: use NEXT_PUBLIC_SUPABASE_ANON_KEY, not a service role key.");
  }
}

function decodeJwtPayload(token: string): { role?: string } | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;
  try {
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as { role?: string };
  } catch {
    return null;
  }
}
