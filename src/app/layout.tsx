import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lessonflowapp.com"),
  title: {
    default: "LessonFlow",
    template: "%s · LessonFlow"
  },
  description: "Prepare recurring English lessons faster with student memory, reusable materials, and weekly prep.",
  openGraph: {
    title: "LessonFlow",
    description: "Prepare recurring English lessons faster with student memory, reusable materials, and weekly prep.",
    url: "https://lessonflowapp.com",
    siteName: "LessonFlow",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "LessonFlow",
    description: "Prepare recurring English lessons faster with student memory, reusable materials, and weekly prep."
  },
  applicationName: "LessonFlow",
  appleWebApp: {
    title: "LessonFlow",
    capable: true,
    statusBarStyle: "default"
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem("lessonflow-theme") || "coral";
                  document.documentElement.setAttribute("data-theme", theme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
