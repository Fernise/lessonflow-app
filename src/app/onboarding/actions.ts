"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { createDemoWorkspace } from "@/lib/supabase/teaching-data";

export async function createDemoWorkspaceAction() {
  const { user } = await requireUser();
  await createDemoWorkspace(user.id);
  trackEvent("demo_workspace_loaded", { source: "onboarding" });
  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/materials");
  revalidatePath("/lesson-planner");
  revalidatePath("/weekly-prep");
  redirect("/dashboard");
}
