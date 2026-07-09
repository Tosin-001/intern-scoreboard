import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

// Deliberately NOT using next/font/google here — it requires build-time
// network access to Google's font CDN, which is a fragile dependency for
// a production build to have (one flaky connection and `npm run build`
// fails). A system font stack looks clean and modern (same fallback chain
// Vercel/Linear/GitHub use) with zero external dependency.

export const metadata: Metadata = {
  title: "Intern Scoreboard & Leaderboard",
  description: "Track intern performance and rankings in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
