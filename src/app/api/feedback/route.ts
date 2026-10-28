import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const feedbackCategories = ["Bug", "Improvement", "Missing Feature", "General Feedback", "Account Deletion"] as const;

type FeedbackCategory = (typeof feedbackCategories)[number];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Sign in before sending feedback." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      category?: string;
      type?: string;
      subject?: string;
      message?: string;
      page?: string;
      pageUrl?: string;
    };
    const category = normalizeCategory(body.category || body.type);
    const type = mapCategoryToLegacyType(category);
    const subject = String(body.subject || category).trim();
    const message = String(body.message || "").trim();
    const page = String(body.page || body.pageUrl || "").trim();

    if (message.length < 8) {
      return NextResponse.json({ ok: false, error: "Add a little more detail before sending." }, { status: 400 });
    }

    const { error } = await supabase.from("feedback_requests").insert({
      user_id: user.id,
      email: user.email || "",
      type,
      category,
      subject,
      message,
      page,
      page_url: page,
      status: "new"
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[feedback.create] supabase error", error);
      }
      if (isMissingFeedbackTableError(error.message)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Feedback is not configured yet. Run database/migrations/20260606_add_feedback_requests.sql in Supabase, then retry."
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const emailResult = await sendFeedbackEmail({
      category,
      subject,
      message,
      page,
      userEmail: user.email || ""
    });

    return NextResponse.json({ ok: true, emailSent: emailResult.sent });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send request." }, { status: 500 });
  }
}

function isMissingFeedbackTableError(message: string) {
  return message.includes("feedback_requests") && message.toLowerCase().includes("schema cache");
}

function normalizeCategory(value: string | undefined): FeedbackCategory {
  const candidate = String(value || "").trim();
  if (candidate === "Feedback") return "General Feedback";
  if (candidate === "Bug Report") return "Bug";
  if (candidate === "Feature Request") return "Missing Feature";
  return feedbackCategories.includes(candidate as FeedbackCategory) ? (candidate as FeedbackCategory) : "General Feedback";
}

function mapCategoryToLegacyType(category: FeedbackCategory) {
  if (category === "Bug") return "Bug Report";
  if (category === "Missing Feature" || category === "Improvement") return "Feature Request";
  if (category === "Account Deletion") return "Account Deletion";
  return "Feedback";
}

async function sendFeedbackEmail({
  category,
  subject,
  message,
  page,
  userEmail
}: {
  category: FeedbackCategory;
  subject: string;
  message: string;
  page: string;
  userEmail: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[feedback.email] RESEND_API_KEY is not configured; feedback was saved without email notification.");
    }
    return { sent: false };
  }

  const to = process.env.FEEDBACK_NOTIFICATION_EMAIL || "hello@lessonflowapp.com";
  const from = process.env.FEEDBACK_FROM_EMAIL || "LessonFlow <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: userEmail || undefined,
        subject: `[LessonFlow Feedback] ${subject}`,
        text: [
          `Category: ${category}`,
          `From: ${userEmail || "Unknown user"}`,
          `Page: ${page || "Not captured"}`,
          "",
          message
        ].join("\n")
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === "development") {
        console.error("[feedback.email] resend error", { status: response.status, errorText });
      }
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[feedback.email] request failed", error);
    }
    return { sent: false };
  }
}
