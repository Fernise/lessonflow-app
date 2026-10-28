"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { FileText, LifeBuoy, Palette, Send, UserRound, X } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import { AppSelect } from "@/components/ui/app-select";
import { showToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

type SettingsWorkspaceProps = {
  email: string;
};

type SettingsTab = "account" | "preferences" | "legal" | "feedback";

type AccountPrefs = {
  displayName: string;
  timezone: string;
};

type PreferencePrefs = {
  language: "English";
  defaultLessonDuration: string;
  defaultMaterialType: string;
  defaultCefrLevel: string;
};

const storageKey = "lessonflow-settings-v2";

const defaultAccountPrefs: AccountPrefs = {
  displayName: "",
  timezone: "Europe/Vienna"
};

const defaultPreferencePrefs: PreferencePrefs = {
  language: "English",
  defaultLessonDuration: "45 minutes",
  defaultMaterialType: "Speaking questions",
  defaultCefrLevel: "B1"
};

const supportEmail = "hello@lessonflowapp.com";
const feedbackTypes = ["Bug", "Improvement", "Missing Feature", "General Feedback"] as const;

type FeedbackType = (typeof feedbackTypes)[number] | "Account Deletion";

export function SettingsWorkspace({ email }: SettingsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [account, setAccount] = useState<AccountPrefs>(defaultAccountPrefs);
  const [preferences, setPreferences] = useState<PreferencePrefs>(defaultPreferencePrefs);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    type: FeedbackType;
    subject: string;
    message: string;
    confirmDeletion?: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        account?: Partial<AccountPrefs>;
        preferences?: Partial<PreferencePrefs>;
      };
      setAccount({ ...defaultAccountPrefs, ...parsed.account });
      setPreferences({ ...defaultPreferencePrefs, ...parsed.preferences, language: "English" });
    } catch {
      // Ignore invalid localStorage payload.
    }
  }, []);

  function persist(next: { account?: AccountPrefs; preferences?: PreferencePrefs }) {
    const payload = {
      account: next.account || account,
      preferences: next.preferences || preferences
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  async function sendPasswordResetEmail() {
    if (!email) {
      showToast({ type: "error", title: "No email found", description: "Sign in again before requesting a password reset." });
      return;
    }

    setIsResettingPassword(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showToast({ type: "success", title: "Password reset email sent", description: `Check ${email}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send password reset email.";
      showToast({ type: "error", title: "Password reset failed", description: message });
    } finally {
      setIsResettingPassword(false);
    }
  }

  const tabs = useMemo(
    () => [
      { id: "account" as const, label: "Account", icon: UserRound },
      { id: "preferences" as const, label: "Preferences", icon: Palette },
      { id: "legal" as const, label: "Legal", icon: FileText },
      { id: "feedback" as const, label: "Feedback", icon: LifeBuoy }
    ],
    []
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[220px,1fr]">
      <aside className="rounded-3xl border border-rose-100 bg-white p-3 shadow-sm">
        <nav className="grid gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  selected ? "bg-[#FFF5F8] text-[#FF4F7B]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="space-y-4">
        {activeTab === "account" ? (
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Account</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Your profile</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Manage the basic details used in your private beta workspace.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Name"
                value={account.displayName}
                onChange={(value) => setAccount((current) => ({ ...current, displayName: value }))}
                placeholder="Fernise"
              />
              <Field label="Email" value={email} readOnly />
              <Select
                label="Timezone"
                value={account.timezone}
                onChange={(value) => setAccount((current) => ({ ...current, timezone: value }))}
                options={["Europe/Vienna", "UTC", "Europe/Madrid", "America/New_York", "America/Los_Angeles"]}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <SaveButton
                onClick={() => {
                  persist({ account });
                  showToast({ type: "success", title: "Account settings saved" });
                }}
              >
                Save changes
              </SaveButton>
              <button
                type="button"
                onClick={sendPasswordResetEmail}
                disabled={isResettingPassword}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResettingPassword ? "Sending..." : "Send password reset email"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFeedbackModal({
                    type: "Account Deletion",
                    subject: "Account deletion request",
                    message: "Please delete my LessonFlow account and associated workspace data.",
                    confirmDeletion: true
                  })
                }
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
              >
                Request account deletion
              </button>
            </div>
          </article>
        ) : null}

        {activeTab === "preferences" ? (
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Preferences</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Workspace defaults</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Set simple defaults for the way you prepare lessons. These preferences are stored locally for now.
              </p>
            </div>

            <div className="mt-5">
              <ThemeSelector />
            </div>

            <div className="mt-5 grid gap-x-4 gap-y-6 pb-8 md:grid-cols-2">
              <Field label="Language" value={preferences.language} readOnly />
              <Select
                label="Default lesson duration"
                value={preferences.defaultLessonDuration}
                onChange={(value) => setPreferences((current) => ({ ...current, defaultLessonDuration: value }))}
                options={["15 minutes", "30 minutes", "45 minutes", "60 minutes"]}
              />
              <Select
                label="Default material type"
                value={preferences.defaultMaterialType}
                onChange={(value) => setPreferences((current) => ({ ...current, defaultMaterialType: value }))}
                options={["Speaking questions", "Vocabulary sheet", "Listening activity", "Quiz", "Roleplay"]}
              />
              <Select
                label="Default CEFR level"
                value={preferences.defaultCefrLevel}
                onChange={(value) => setPreferences((current) => ({ ...current, defaultCefrLevel: value }))}
                options={["A1", "A2", "B1", "B2", "C1", "C2"]}
              />
            </div>

            <div className="mt-2 border-t border-rose-100 pt-5">
              <SaveButton
                onClick={() => {
                  persist({ preferences });
                  showToast({ type: "success", title: "Preferences saved" });
                }}
              >
                Save preferences
              </SaveButton>
            </div>
          </article>
        ) : null}

        {activeTab === "legal" ? (
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Legal</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Policies and contact</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review beta terms, privacy notes, and contact LessonFlow support.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard
                title="Privacy Policy"
                copy="How tutor, student, AI, and analytics data are handled."
                href="/privacy"
              />
              <ActionCard
                title="Cookie Policy"
                copy="How cookies and similar technologies are used on LessonFlow."
                href="/cookies"
              />
              <ActionCard
                title="Terms of Service"
                copy="User responsibilities, acceptable use, AI content, liability, and governing terms."
                href="/terms"
              />
              <ActionCard title="Contact" copy="Questions about beta access, privacy, terms, or support." href={`mailto:${supportEmail}`} />
            </div>
          </article>
        ) : null}

        {activeTab === "feedback" ? (
          <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-[#FF4F7B]">Feedback</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1F2937]">Help shape LessonFlow</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Send product feedback or report a bug directly from your beta workspace.
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ActionCard
                title="Send Feedback"
                copy="Share a bug, improvement, missing feature, or general feedback from one focused page."
                href="/feedback"
              />
            </div>
          </article>
        ) : null}
      </div>
      {feedbackModal ? (
        <FeedbackModal
          email={email}
          initialType={feedbackModal.type}
          initialSubject={feedbackModal.subject}
          initialMessage={feedbackModal.message}
          confirmDeletion={feedbackModal.confirmDeletion}
          onClose={() => setFeedbackModal(null)}
        />
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  readOnly = false,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none ring-[#FF4F7B] focus:ring-2 ${
          readOnly ? "border-rose-100 bg-slate-50 text-slate-600" : "border-rose-100 bg-white text-[#1F2937]"
        }`}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <AppSelect
        value={value}
        onChange={onChange}
        options={options.map((option) => ({ value: option, label: option }))}
        className="mt-2"
      />
    </label>
  );
}

function SaveButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69]"
    >
      {children}
    </button>
  );
}

function ActionCard({ title, copy, href, onClick }: { title: string; copy: string; href?: string; onClick?: () => void }) {
  const className =
    "rounded-2xl border border-rose-100 bg-[#FFF5F8] p-4 transition hover:border-[#FF4F7B] hover:bg-white";
  const content = (
    <>
      <p className="text-sm font-semibold text-[#1F2937]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
      <p className="mt-3 text-xs font-semibold text-[#FF4F7B]">Open</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} text-left`}>
        {content}
      </button>
    );
  }

  if (!href) return null;

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href as Route} className={className}>
      {content}
    </Link>
  );
}

function FeedbackModal({
  email,
  initialType,
  initialSubject,
  initialMessage,
  confirmDeletion,
  onClose
}: {
  email: string;
  initialType: FeedbackType;
  initialSubject: string;
  initialMessage: string;
  confirmDeletion?: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<FeedbackType>(initialType);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [confirmed, setConfirmed] = useState(!confirmDeletion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = subject.trim().length > 0 && message.trim().length >= 8 && confirmed;

  async function submitFeedback() {
    if (!canSubmit) {
      showToast({
        type: "error",
        title: confirmDeletion ? "Confirm deletion request" : "Add a little more detail",
        description: confirmDeletion ? "Please confirm before sending the request." : "Please add a subject and a short message."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject,
          message,
          pageUrl: window.location.href
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not send request.");
      }
      onClose();
      showToast({
        type: "success",
        title: confirmDeletion ? "Account deletion request sent" : "Thanks, your feedback was sent."
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Could not send request.";
      showToast({ type: "error", title: "Request failed", description });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <article className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FF4F7B]">
              {confirmDeletion ? "Account request" : "Beta feedback"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#1F2937]">
              {confirmDeletion ? "Request account deletion" : "Send feedback"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {confirmDeletion
                ? "We will review this request and follow up with the account email."
                : "Your message is saved securely and includes your current page automatically."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-rose-100 p-2 text-slate-500 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="mt-5 space-y-4">
          <Select
            label="Type"
            value={type}
            onChange={(value) => setType(value as FeedbackType)}
            options={confirmDeletion ? ["Account Deletion"] : [...feedbackTypes]}
          />
          <Field label="Email" value={email} readOnly />
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="Short summary" />
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-rose-100 bg-white px-3 py-2 text-sm leading-6 text-[#1F2937] outline-none ring-[#FF4F7B] focus:ring-2"
              placeholder="What happened? What should we improve?"
            />
          </label>
          <Field label="Current page" value={typeof window === "undefined" ? "" : window.location.pathname} readOnly />
          {confirmDeletion ? (
            <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>I understand this sends an account deletion request for review.</span>
            </label>
          ) : null}
        </div>

        <footer className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-rose-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#FF4F7B] hover:text-[#FF4F7B]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitFeedback}
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF4F7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E63E69] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send size={16} aria-hidden="true" />
            {isSubmitting ? "Sending..." : confirmDeletion ? "Send request" : "Send"}
          </button>
        </footer>
      </article>
    </div>
  );
}
