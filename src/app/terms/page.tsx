import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | LessonFlow",
  description: "LessonFlow Terms of Service."
};

const termsSections = [
  {
    title: "1. Introduction",
    body: [
      "Welcome to LessonFlow.",
      'These Terms of Service ("Terms") govern your access to and use of the LessonFlow website, platform, and related services operated by Fernando González, doing business as LessonFlow ("LessonFlow", "we", "us", or "our").',
      "By accessing or using LessonFlow, you agree to be bound by these Terms.",
      "If you do not agree to these Terms, you may not use the Services."
    ]
  },
  {
    title: "2. Eligibility",
    body: [
      "LessonFlow is intended for users who are at least 18 years old.",
      "By using the Services, you represent and warrant that you are at least 18 years of age."
    ]
  },
  {
    title: "3. Description of Services",
    body: [
      "LessonFlow is an AI-powered lesson planning and student management platform designed for teachers, tutors, and educators.",
      "Features may include student management, lesson planning, teaching material generation, AI-powered content assistance, class preparation tools, and educational workflow management.",
      "We may modify, suspend, or discontinue any feature at any time."
    ]
  },
  {
    title: "4. User Accounts",
    body: [
      "You are responsible for maintaining the security of your account.",
      "You agree to provide accurate information and to keep your account credentials secure.",
      "You may not transfer, sell, lease, or assign your account to another person."
    ]
  },
  {
    title: "5. User Content",
    body: [
      "You retain ownership of any content you submit to the platform.",
      "By submitting content, you grant LessonFlow a limited license to store, process, and display that content solely for the purpose of operating the Services.",
      "You are solely responsible for the content you upload, create, or store through LessonFlow."
    ]
  },
  {
    title: "6. Acceptable Use",
    body: [
      "You agree not to violate any applicable law or regulation; upload unlawful, harmful, fraudulent, or misleading content; infringe intellectual property rights; upload malware, viruses, or malicious code; attempt to gain unauthorized access to the platform; scrape, reverse engineer, or interfere with the Services; use the Services for spam or abusive activities; or sell or transfer your account to another person."
    ]
  },
  {
    title: "7. Artificial Intelligence Features",
    body: [
      "LessonFlow may use artificial intelligence services to generate educational content.",
      "AI-generated content may contain inaccuracies and should be reviewed before use.",
      "You remain responsible for verifying the accuracy and suitability of generated content.",
      "LessonFlow does not guarantee the correctness, completeness, or fitness of AI-generated content."
    ]
  },
  {
    title: "8. Intellectual Property",
    body: [
      "The LessonFlow platform, branding, software, design, and related materials are owned by LessonFlow or its licensors and are protected by applicable intellectual property laws.",
      "Except as expressly permitted, you may not copy, distribute, modify, or create derivative works from the Services."
    ]
  },
  {
    title: "9. Third-Party Services",
    body: [
      "LessonFlow may integrate with third-party providers, including authentication, hosting, analytics, and AI providers.",
      "We are not responsible for third-party services, websites, or content."
    ]
  },
  {
    title: "10. Disclaimer of Warranties",
    body: [
      'The Services are provided on an "AS IS" and "AS AVAILABLE" basis.',
      "To the maximum extent permitted by law, LessonFlow disclaims all warranties, whether express or implied."
    ]
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, LessonFlow shall not be liable for any indirect, incidental, consequential, special, or punitive damages.",
      "If liability cannot be excluded, LessonFlow's total liability shall not exceed the amount paid by the user to LessonFlow during the six (6) months preceding the event giving rise to the claim."
    ]
  },
  {
    title: "12. Indemnification",
    body: [
      "You agree to indemnify and hold harmless LessonFlow from any claims, damages, liabilities, and expenses arising from your use of the Services or violation of these Terms."
    ]
  },
  {
    title: "13. Termination",
    body: [
      "We may suspend or terminate accounts that violate these Terms.",
      "Users may stop using the Services at any time."
    ]
  },
  {
    title: "14. Governing Law",
    body: ["These Terms shall be governed by and construed in accordance with the laws of Spain."]
  },
  {
    title: "15. Dispute Resolution",
    body: [
      "Before initiating arbitration, both parties agree to attempt to resolve disputes through informal negotiations for at least thirty (30) days.",
      "Any unresolved dispute shall be submitted to arbitration in Santa Cruz de Tenerife, Spain.",
      "The language of arbitration shall be English."
    ]
  },
  {
    title: "16. Changes to These Terms",
    body: [
      "We may update these Terms from time to time.",
      "Material changes will be communicated before becoming effective.",
      "The updated effective date will always be displayed at the top of this document."
    ]
  },
  {
    title: "17. Contact",
    body: ["If you have questions regarding these Terms, please contact hello@lessonflowapp.com."]
  }
];

export default async function TermsPage() {
  return (
    <LegalPageShell
      label="Terms of Service"
      title="LessonFlow Terms of Service"
      intro="Effective Date: June 6, 2026"
    >
      <div className="grid gap-4">
        {termsSections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-rose-100 bg-[#FFF5F8] p-5">
            <h2 className="text-lg font-semibold text-[#1F2937]">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              {section.body.map((paragraph) => (
                <p key={paragraph}>
                  {paragraph.includes("hello@lessonflowapp.com") ? (
                    <>
                      {paragraph.replace("hello@lessonflowapp.com", "")}
                      <a href="mailto:hello@lessonflowapp.com" className="font-semibold text-[#FF4F7B] hover:text-[#E63E69]">
                        hello@lessonflowapp.com
                      </a>
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </LegalPageShell>
  );
}
