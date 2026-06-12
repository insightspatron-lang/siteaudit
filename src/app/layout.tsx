import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Opportunity Finder",
  description: "Find businesses with website improvement opportunities and generate personalized outreach — powered by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
