"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import {
  createStudentRecordWithClient,
  deleteStudentRecord,
  listStudents,
  parseStudentFormData,
  seedSampleStudents,
  updateStudentRecord,
  type StudentFormState
} from "@/lib/supabase/teaching-data";

export async function createStudentAction(_state: StudentFormState, formData: FormData): Promise<StudentFormState> {
  try {
    const { user, supabase } = await requireUser();
    const {
      data: { user: insertUser },
      error: insertUserError
    } = await supabase.auth.getUser();

    if (insertUserError || !insertUser) {
      throw new Error("No authenticated Supabase session found for student creation.");
    }
    if (insertUser.id !== user.id) {
      throw new Error("Supabase session mismatch detected before student insert.");
    }

    const { students } = await listStudents();
    const id = await createStudentRecordWithClient(supabase, user.id, parseStudentFormData(formData));
    trackEvent("student_created", { studentId: id });
    if (students.length === 0) trackEvent("first_student_created", { studentId: id });
    revalidatePath("/students");
    redirect(`/students/${id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "Could not create student." };
  }
}

export async function updateStudentAction(
  studentId: string,
  _state: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  try {
    const { user } = await requireUser();
    await updateStudentRecord(user.id, studentId, parseStudentFormData(formData));
    revalidatePath("/students");
    revalidatePath(`/students/${studentId}`);
    redirect(`/students/${studentId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "Could not update student." };
  }
}

export async function deleteStudentAction(formData: FormData) {
  const { user } = await requireUser();
  const studentId = String(formData.get("studentId") || "");
  if (studentId) {
    await deleteStudentRecord(user.id, studentId);
    trackEvent("student_deleted", { studentId });
  }
  revalidatePath("/students");
  redirect("/students");
}

export async function seedSampleStudentsAction() {
  const { user } = await requireUser();
  await seedSampleStudents(user.id);
  revalidatePath("/students");
  redirect("/students");
}

function isRedirectError(error: unknown) {
  return error instanceof Error && error.message === "NEXT_REDIRECT";
}
