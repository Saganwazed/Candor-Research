import type { Metadata } from "next";
import "./globals.css";
import { PHProvider } from "./posthog-provider";

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
      <body>
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}
