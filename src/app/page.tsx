import Link from "next/link";
import { ArrowRight, Brain, CalendarDays, CheckCircle2, Library, Sparkles, Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AnalyticsLink } from "@/components/analytics-link";
import { AnalyticsPageView } from "@/components/analytics-page-view";

const painPoints = [
  "Scattered materials across docs, chats, and folders",
  "Repetitive lesson prep for recurring students",
  "Forgetting student context before class",
  "Switching between ChatGPT, Docs, and notes"
];

const featureCards = [
  { title: "Student Profiles", copy: "Goals, mistakes, vocabulary, confidence, and lesson history in one place.", icon: Users },
  { title: "Student Memory", copy: "Keep recurring context visible before every lesson.", icon: Brain },
  { title: "Vocabulary Sheets", copy: "Practical chunks and phrases grouped by real lesson topics.", icon: Brain },
  { title: "Materials Library", copy: "Reuse, edit, favorite, and duplicate your best materials quickly.", icon: Library },
  { title: "Lesson Planner", copy: "Plan recurring lessons with clear status, notes, and linked materials.", icon: Sparkles },
  { title: "Weekly Prep", copy: "Know what is missing, what is reusable, and what is already ready.", icon: CalendarDays }
] as const;

const howItWorks = [
  { title: "Add your student", copy: "Capture goals, level, interests, and recurring learning notes." },
  { title: "Generate material", copy: "Create speaking, vocabulary, quizzes, and roleplay resources in minutes." },
  { title: "Reuse and prepare your week", copy: "Turn each output into reusable teaching assets for upcoming lessons." }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FFF5F8] text-[#1F2937]">
      <AnalyticsPageView eventName="landing_viewed" eventProperties={{ route: "/" }} />
      <AppHeader
        action={
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-[#FF4F7B] sm:inline-flex">
              Log in
            </Link>
            <AnalyticsLink
              href="/login"
              eventName="start_free_clicked"
              eventProperties={{ location: "header" }}
              className="rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
            >
              Start creating
            </AnalyticsLink>
          </div>
        }
      />

      <section className="page-shell grid min-h-[calc(100vh-64px)] items-center gap-10 py-10 lg:grid-cols-[1fr,1fr]">
        <div className="animate-[fadeIn_.45s_ease-out]">
          <p className="mb-4 w-fit rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-[#FF4F7B] shadow-sm">
            Your AI teaching workspace for online tutors
          </p>
          <h1 className="text-5xl font-semibold leading-tight md:text-6xl">Prepare better online lessons in minutes.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Build a recurring lesson workflow with student memory, reusable materials, and weekly preparation in one calm workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <AnalyticsLink
              href="/login"
              eventName="start_free_clicked"
              eventProperties={{ location: "hero" }}
              className="flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-5 py-3 font-semibold text-white transition hover:bg-[#E63E69]"
            >
              Start creating
              <ArrowRight size={18} aria-hidden="true" />
            </AnalyticsLink>
            <AnalyticsLink
              href="/onboarding"
              eventName="view_demo_clicked"
              eventProperties={{ location: "hero" }}
              className="rounded-xl border border-rose-200 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
            >
              View demo
            </AnalyticsLink>
          </div>
        </div>

        <div className="relative animate-[fadeIn_.6s_ease-out]">
          <div className="pointer-events-none absolute -left-5 -top-5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#FF4F7B] shadow-sm animate-[floatTag_4s_ease-in-out_infinite]">
            B1 Speaking
          </div>
          <div className="pointer-events-none absolute -right-4 top-14 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#FF4F7B] shadow-sm animate-[floatTag_5s_ease-in-out_infinite]">
            Vocabulary
          </div>
          <div className="pointer-events-none absolute left-6 bottom-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#FF4F7B] shadow-sm animate-[floatTag_6s_ease-in-out_infinite]">
            Weekly prep
          </div>

          <div className="rounded-[28px] border border-rose-100 bg-white p-4 shadow-[0_20px_60px_rgba(255,79,123,0.12)]">
            <div className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4F7B]">Dashboard preview</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Week of May 27</h2>
                </div>
                <span className="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">8 lessons</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Student memory</p>
                  <p className="mt-1 font-semibold">Paula · B1</p>
                  <p className="mt-2 text-sm text-slate-600">Goal: Speak more naturally in meetings</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Previous lesson context</p>
                  <p className="mt-1 font-semibold text-slate-800">Topic: Technology Addiction</p>
                  <p className="mt-2 text-sm text-slate-600">Issue: overusing present simple for past events</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm md:col-span-2">
                  <p className="text-xs text-slate-500">Vocabulary to review</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["deadline", "follow up", "set up", "reschedule", "touch base"].map((item) => (
                      <span key={item} className="rounded-lg border border-rose-200 bg-[#FFF5F8] px-2.5 py-1 text-xs font-semibold text-[#FF4F7B]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-rose-100 bg-white py-14">
        <div className="page-shell">
          <h2 className="text-3xl font-semibold">The prep friction online tutors know too well</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {painPoints.map((item) => (
              <article key={item} className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4 transition hover:shadow-sm">
                <p className="text-sm font-medium text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="page-shell grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#FF4F7B]">The solution</p>
            <h2 className="mt-2 text-3xl font-semibold">One workspace for student context, generation, and weekly prep.</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {[
                "Student memory and student profiles",
                "AI material generator for real 1:1 classes",
                "Reusable materials library",
                "Lesson planner for recurring classes",
                "Weekly prep intelligence and checklist"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-[#FF4F7B]" size={16} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-[#FFF5F8] p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Example material preview</h3>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-4">
              <p className="text-xl font-semibold">Technology Addiction</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">B1 · Speaking Questions</p>
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#FF4F7B]">Easier Questions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>How has your phone use changed in the last five years?</li>
                    <li>What habits make it hard to disconnect at night?</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#FF4F7B]">Main Discussion</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Do social apps improve communication or make it more superficial?</li>
                    <li>Who should be responsible for digital balance: users, schools, or companies?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-rose-100 bg-white py-16">
        <div className="page-shell">
          <p className="text-sm font-semibold text-[#FF4F7B]">Product screenshots</p>
          <h2 className="mt-2 text-3xl font-semibold">A recurring lesson workflow in one calm workspace.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Student profile memory", "Goals, recurring mistakes, and vocabulary to recycle before class."],
              ["AI generator workspace", "Speaking, vocabulary, roleplay, and quiz generation with context."],
              ["Weekly prep checklist", "Missing materials, reusable assets, and lesson readiness in one view."]
            ].map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-rose-100 bg-[#FFF5F8] p-5">
                <p className="text-sm font-semibold text-[#1F2937]">{title}</p>
                <p className="mt-2 text-sm text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="page-shell">
          <p className="text-sm font-semibold text-[#FF4F7B]">Why tutors use LessonFlow</p>
          <h2 className="mt-2 text-3xl font-semibold">Built for recurring students, not one-off content prompts.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Student Memory", "Keep goals, mistakes, and progress visible before each class."],
              ["Reusable Materials", "Reuse and adapt your best materials across similar students."],
              ["Weekly Prep", "See what is ready and what still needs preparation this week."]
            ].map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-[#1F2937]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-rose-100 bg-white py-16">
        <div className="page-shell">
          <p className="text-sm font-semibold text-[#FF4F7B]">Feature highlights</p>
          <h2 className="mt-2 text-3xl font-semibold">Built for online ESL, business English, and freelance tutors.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ title, copy, icon: Icon }) => (
              <article key={title} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(255,79,123,0.14)]">
                <Icon size={22} className="text-[#FF4F7B]" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="page-shell">
          <p className="text-sm font-semibold text-[#FF4F7B]">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold">From student profile to weekly teaching flow in 3 steps.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <article key={step.title} className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
                <span className="inline-flex rounded-xl bg-[#FF4F7B] px-2.5 py-1 text-xs font-semibold text-white">Step {index + 1}</span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-rose-100 bg-[#1F2937] py-14 text-white">
        <div className="page-shell rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Ready to prepare your next class faster?</h2>
              <p className="mt-2 text-sm text-slate-200">Start creating reusable materials with your student context in one focused workspace.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnalyticsLink
                href="/login"
                eventName="start_free_clicked"
                eventProperties={{ location: "final_cta" }}
                className="rounded-xl bg-[#FF4F7B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
              >
                Start creating
              </AnalyticsLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-rose-100 bg-white py-8">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>© {new Date().getFullYear()} LessonFlow</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition hover:text-[#FF4F7B]">Privacy Policy</Link>
            <Link href="/cookies" className="transition hover:text-[#FF4F7B]">Cookie Policy</Link>
            <Link href="/terms" className="transition hover:text-[#FF4F7B]">Terms of Service</Link>
            <a href="mailto:hello@lessonflowapp.com" className="transition hover:text-[#FF4F7B]">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
