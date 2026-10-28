"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  assertAnonKey(key);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key
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
    const json = atob(padded);
    return JSON.parse(json) as { role?: string };
  } catch {
    return null;
  }
}
