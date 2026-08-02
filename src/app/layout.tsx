import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luminary Network — AI Video Studio",
  description:
    "AI-driven video creation platform: turn text and scripts into videos and full films.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-white/10 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-fuchsia-500 to-cyan-400" />
              Luminary&nbsp;Network
            </Link>
            <nav className="text-sm text-white/70">
              <span className="rounded-full border border-white/15 px-3 py-1">
                AI Video Studio
              </span>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
          Luminary Network · AI-driven video creation
        </footer>
      </body>
    </html>
  );
}
