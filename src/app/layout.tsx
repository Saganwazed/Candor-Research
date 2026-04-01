import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candor — AI-powered news bias detection",
  description:
    "Paste a news article or URL. Get an instant bias report with direction analysis, credibility flags, and hidden agenda detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
