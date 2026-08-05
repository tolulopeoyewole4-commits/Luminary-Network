import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Pilot edits",
  robots: { index: false, follow: false },
};

type PilotSource = {
  id: string;
  label: string;
  driveId: string;
  durationLabel: string;
  resolution: string;
  previewSrc: string;
  notes: string;
  reels: Array<{
    id: string;
    title: string;
    window: string;
    src: string;
    presets: string;
  }>;
};

const PILOTS: PilotSource[] = [
  {
    id: "a",
    label: "Pilot A",
    driveId: "15QCPeZCx7RpwWYIkPRP1voFJH6riagHV",
    durationLabel: "34:10 source",
    resolution: "720×1440 · 60fps",
    previewSrc: "/demo/pilot/preview-a.mp4",
    notes:
      "Already vertical — framed to 1080×1920 with burned captions and Creator Studio stamp.",
    reels: [
      {
        id: "a-hook",
        title: "Hook open",
        window: "0:12 – 0:27",
        src: "/demo/pilot/pilot-a-hook.mp4",
        presets: "9:16 · burned captions · brand stamp",
      },
      {
        id: "a-insight",
        title: "Teaching beat",
        window: "3:00 – 3:18",
        src: "/demo/pilot/pilot-a-insight.mp4",
        presets: "9:16 · burned captions · brand stamp",
      },
    ],
  },
  {
    id: "b",
    label: "Pilot B",
    driveId: "1l5vLmipXz3f-zhN5AkvUsRsviHQ1NoOg",
    durationLabel: "31:52 source",
    resolution: "720×1440 · 60fps",
    previewSrc: "/demo/pilot/preview-b.mp4",
    notes:
      "Second long-form source cut into scroll-stopping shorts with identity on frame.",
    reels: [
      {
        id: "b-hook",
        title: "Cold open",
        window: "0:08 – 0:24",
        src: "/demo/pilot/pilot-b-hook.mp4",
        presets: "9:16 · burned captions · brand stamp",
      },
      {
        id: "b-cta",
        title: "CTA close",
        window: "4:00 – 4:18",
        src: "/demo/pilot/pilot-b-cta.mp4",
        presets: "9:16 · burned captions · brand stamp",
      },
    ],
  },
];

export default function PilotEditsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo href="/demo/pilot-edits" size="md" />
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/demo/reel-export" className="text-muted hover:text-foreground">
              Layout mock
            </Link>
            <span className="text-accent">Pilot edits</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-8">
        <section className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Pilot edits
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Your Drive videos, cut for Reels
          </h1>
          <p className="mt-3 text-muted">
            Both shared sources were imported, previewed, and exported as vertical
            shorts with burned captions and brand identity — the same FFmpeg path
            used by Luminary clip export.
          </p>
        </section>

        {PILOTS.map((pilot) => (
          <section key={pilot.id} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl font-semibold">{pilot.label}</h2>
                <p className="mt-1 text-sm text-muted">
                  {pilot.durationLabel} · {pilot.resolution} · Drive{" "}
                  <code className="text-xs">{pilot.driveId.slice(0, 8)}…</code>
                </p>
                <p className="mt-2 max-w-2xl text-sm text-muted">{pilot.notes}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="surface-card overflow-hidden">
                <div className="bg-black">
                  <video
                    className="mx-auto max-h-[32rem] w-full object-contain"
                    src={pilot.previewSrc}
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
                <p className="border-t border-[var(--border)] px-4 py-3 text-sm text-muted">
                  Source preview (first ~22s, compressed for the demo)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {pilot.reels.map((reel) => (
                  <article key={reel.id} className="surface-card overflow-hidden">
                    <div className="flex justify-center bg-slate-950">
                      <video
                        className="h-[28rem] w-auto max-w-full object-contain"
                        src={reel.src}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>
                    <div className="space-y-1 px-4 py-3">
                      <p className="font-semibold text-foreground">{reel.title}</p>
                      <p className="text-sm text-muted">{reel.window}</p>
                      <p className="text-xs text-muted">{reel.presets}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="surface-card px-5 py-5 text-sm text-muted">
          <p className="font-semibold text-foreground">Pilot pipeline used</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Download private-to-shared Drive MP4s</li>
            <li>ffprobe metadata (vertical 720×1440 sources)</li>
            <li>Cut short windows → scale/crop to 1080×1920</li>
            <li>Burn WebVTT captions + drawtext brand stamp</li>
            <li>Serve exports on this desktop demo page</li>
          </ol>
          <p className="mt-3">
            Authenticated product path: upload → detect clips → approve → export
            with the same presets on the project clips page.
          </p>
        </section>
      </main>
    </div>
  );
}
