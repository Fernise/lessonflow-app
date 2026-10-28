import { isFeedbackAdmin } from "@/lib/feedback-access.mjs";
import { AppShell } from "@/components/app-shell";
import { FeedbackWorkspace } from "@/components/feedback-workspace";
import { requireUser } from "@/lib/auth";

type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string;
  category: string;
  message: string;
  page: string;
  created_at: string;
};

export default async function FeedbackPage() {
  const { user, supabase } = await requireUser();
  const isAdmin = isFeedbackAdmin(user);
  let feedbackRows: FeedbackRow[] = [];
  let feedbackError: string | null = null;

  if (isAdmin) {
    const { data, error } = await supabase
      .from("feedback_requests")
      .select("id,user_id,email,category,message,page,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      feedbackError = error.message;
    } else {
      feedbackRows = (data || []) as FeedbackRow[];
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-[#FF4F7B]">Feedback</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1F2937]">Beta feedback</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Tell us what to fix, improve, or add next. Feedback helps shape the private beta.
          </p>
        </header>

        <FeedbackWorkspace email={user.email || ""} />

        {isAdmin ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#FF4F7B]">Admin</p>
                <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">Latest feedback</h2>
              </div>
              <span className="rounded-full bg-[#FFF5F8] px-3 py-1 text-xs font-semibold text-slate-600">
                {feedbackRows.length} shown
              </span>
            </div>

            {feedbackError ? (
              <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                Could not load feedback: {feedbackError}
              </div>
            ) : feedbackRows.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4 text-sm leading-6 text-slate-600">
                No feedback yet.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {feedbackRows.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#FF4F7B]">
                          {item.category || "General Feedback"}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{item.page || "No page captured"}</span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                    <p className="mt-3 text-xs text-slate-500">{item.email || item.user_id || "Unknown user"}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
