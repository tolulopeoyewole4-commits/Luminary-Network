import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,162,39,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(15,110,106,0.18),transparent_35%)]"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo size="md" href="/" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Knowledge creators
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Luminary AI
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Upload knowledge once. Publish everywhere. Teach forever.
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Transform books, sermons, trainings, and long-form video into courses,
          social posts, and short-form content — privately and on your terms.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="btn-primary px-5 py-3">
            Create your account
          </Link>
          <Link href="/login" className="btn-secondary px-5 py-3">
            Sign in to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
