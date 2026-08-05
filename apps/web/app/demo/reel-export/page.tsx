import type { Metadata } from "next";

import { Logo } from "@/components/brand/Logo";
import { ASPECT_RATIO_LABELS } from "@/lib/clips/export-presets";

export const metadata: Metadata = {
  title: "Desktop view · Reel export",
  robots: { index: false, follow: false },
};

const MOCK_CLIPS = [
  {
    id: "1",
    title: "Clip 1: Welcome to the core idea",
    reason: "Short-form hook around 00:00 for Reels/Shorts",
    start: "0:00",
    end: "0:18",
    status: "approved" as const,
    score: 92,
  },
  {
    id: "2",
    title: "Clip 2: Practical example learners remember",
    reason: "Short-form hook around 00:22 for Reels/Shorts",
    start: "0:22",
    end: "0:48",
    status: "suggested" as const,
    score: 87,
  },
  {
    id: "3",
    title: "Clip 3: Clear call to action",
    reason: "Short-form hook around 01:10 for Reels/Shorts",
    start: "1:10",
    end: "1:32",
    status: "exported" as const,
    score: 81,
  },
];

const STATUS_STYLES = {
  suggested: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  approved: "bg-teal-50 text-teal-900",
  exported: "bg-sky-50 text-sky-900",
};

/**
 * Public desktop mock of the reel export workspace (no auth / Supabase).
 * Useful for reviewing layout at ≥1280px and for desktop shell demos.
 */
export default function ReelExportDesktopDemoPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo href="/demo/reel-export" size="md" />
          <nav className="hidden items-center gap-3 text-sm font-medium text-muted md:flex">
            <span>Dashboard</span>
            <span>Projects</span>
            <span className="text-accent">Clips / reels</span>
            <span>Settings</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
              Clip review and reel export
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              teaching-session.mp4
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              MP4 · Detect → approve → export vertical shorts · grounded in
              transcript segments · 1 approved · 1 exported
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary">
              Transcript
            </button>
            <button type="button" className="btn-secondary">
              Captions
            </button>
            <button type="button" className="btn-secondary">
              Re-detect mock clips
            </button>
            <button type="button" className="btn-primary">
              Export 1 approved reel
            </button>
          </div>
        </section>

        <section className="surface-card space-y-4 px-5 py-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Reel export presets
            </h2>
            <p className="mt-1 text-sm text-muted">
              Frame approved clips for vertical social, burn captions, and stamp
              your creator identity before FFmpeg export.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["original", false],
                ["9:16", true],
                ["1:1", false],
              ] as const
            ).map(([ratio, selected]) => (
              <div
                key={ratio}
                className={`rounded-xl px-3 py-3 text-sm ring-1 ${
                  selected
                    ? "bg-[var(--accent-soft)] ring-[var(--accent)]"
                    : "bg-white/70 ring-[var(--border)]"
                }`}
              >
                <p className="font-semibold text-foreground">
                  {ratio === "original" ? "Original" : ratio}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {ASPECT_RATIO_LABELS[ratio]}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-xl bg-white/70 px-3 py-3 text-sm ring-1 ring-[var(--border)]">
              <p className="font-semibold">Burn captions into video</p>
              <p className="mt-1 text-xs text-muted">
                Uses cue text that overlaps each clip window (karaoke-ready MP4).
              </p>
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-3 text-sm ring-1 ring-[var(--border)]">
              <p className="font-semibold">Brand identity stamp</p>
              <p className="mt-1 text-xs text-muted">
                Stamps “Creator Studio” at the top of the frame from your profile
                display name.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative h-44 w-[99px] overflow-hidden rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 ring-1 ring-[var(--border)]">
                <div className="absolute inset-x-2 top-3 text-center text-[9px] font-semibold text-white/90">
                  Creator Studio
                </div>
                <div className="absolute inset-x-2 bottom-5 space-y-1">
                  <div className="h-1.5 rounded bg-white/90" />
                  <div className="h-1.5 w-4/5 rounded bg-white/70" />
                  <div className="h-1.5 w-2/3 rounded bg-white/50" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Exported reels</h2>
          <ul className="space-y-3">
            <li className="surface-card px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">Clip 3: Clear call to action</p>
                  <p className="mt-1 text-sm text-muted">
                    1:10 – 1:32 · 22.0s · 4.2 MB
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    9:16 Reels / Shorts / TikTok · burned captions · brand stamp
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                    ready
                  </span>
                  <button type="button" className="btn-secondary">
                    Secure download
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-card overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-center">
              <div>
                <p className="font-display text-2xl text-white">Source preview</p>
                <p className="mt-2 text-sm text-white/70">
                  Signed private video · seek from candidates
                </p>
              </div>
            </div>
            <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-muted">
              Current time: 0:22 · Click a candidate to jump
            </div>
          </div>

          <aside className="surface-card p-4">
            <p className="field-label">Filter</p>
            <div className="flex flex-wrap gap-2">
              {["All (3)", "Suggested (1)", "Approved (1)", "Exported (1)"].map(
                (label, index) => (
                  <span
                    key={label}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      index === 0
                        ? "bg-[var(--accent)] text-white"
                        : "bg-white/80 text-muted ring-1 ring-[var(--border)]"
                    }`}
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
            <ul className="mt-4 space-y-1">
              {MOCK_CLIPS.map((clip, index) => (
                <li
                  key={clip.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    index === 0
                      ? "bg-[var(--accent)] text-white"
                      : "hover:bg-white"
                  }`}
                >
                  <span className="block font-semibold">
                    {clip.start} – {clip.end}
                  </span>
                  <span
                    className={`mt-1 line-clamp-2 block text-xs ${
                      index === 0 ? "text-white/85" : "text-muted"
                    }`}
                  >
                    {clip.title}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">
            Review candidates
          </h2>
          <p className="text-sm text-muted">
            Approve clips, then export as vertical reels with your selected
            presets.
          </p>
          {MOCK_CLIPS.map((clip) => (
            <article key={clip.id} className="surface-card space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-accent">
                  Preview {clip.start}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[clip.status]}`}
                  >
                    {clip.status}
                  </span>
                  <span className="text-xs text-muted">Score {clip.score}%</span>
                </div>
              </div>
              <div>
                <p className="field-label">Title</p>
                <p className="field-input bg-white/60">{clip.title}</p>
              </div>
              <div>
                <p className="field-label">Why this clip</p>
                <p className="field-input min-h-16 bg-white/60">{clip.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {clip.status === "approved" ? (
                  <button type="button" className="btn-primary">
                    Export reel
                  </button>
                ) : null}
                {clip.status === "exported" ? (
                  <button type="button" className="btn-secondary">
                    Re-export reel
                  </button>
                ) : null}
                {clip.status === "suggested" ? (
                  <button type="button" className="btn-primary">
                    Approve
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <p className="pb-8 text-center text-xs text-muted">
          Desktop demo view · static mock · not connected to Supabase ·{" "}
          <a href="/demo/pilot-edits" className="underline">
            Open real pilot edits
          </a>
        </p>
      </main>
    </div>
  );
}
