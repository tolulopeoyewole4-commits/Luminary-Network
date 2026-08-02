"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { createGeneratedVideoSignedUrlAction } from "@/lib/videos/generate-actions";
import { formatBytes } from "@/lib/uploads/limits";
import type { GeneratedVideo } from "@/types/database";

type GeneratedVideosListProps = {
  videos: GeneratedVideo[];
};

const STATUS_STYLES: Record<GeneratedVideo["status"], string> = {
  processing: "bg-sky-50 text-sky-800",
  ready: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  failed: "bg-red-50 text-red-800",
};

export function GeneratedVideosList({ videos }: GeneratedVideosListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, string>>({});
  const hasProcessing = videos.some((item) => item.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [hasProcessing, router]);

  if (videos.length === 0) {
    return null;
  }

  function play(generatedVideoId: string) {
    setError(null);
    setActiveId(generatedVideoId);
    startTransition(async () => {
      const result = await createGeneratedVideoSignedUrlAction(generatedVideoId);
      setActiveId(null);
      if (!result.ok || !result.signedUrl) {
        setError(result.ok ? "Missing signed URL." : result.error);
        return;
      }
      setPlayers((prev) => ({ ...prev, [generatedVideoId]: result.signedUrl! }));
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">Generated videos</h2>
      <p className="text-sm text-muted">
        AI storyboards rendered to real MP4s with FFmpeg, stored privately.
        Playback uses short-lived signed URLs.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="space-y-3">
        {videos.map((item) => {
          const busy = pending && activeId === item.id;
          const signedUrl = players[item.id];
          return (
            <li key={item.id} className="surface-card px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {item.title || "Untitled video"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.mode === "SCRIPT_TO_FILM"
                      ? "Script → Film"
                      : "Text → Video"}
                    {item.duration_seconds != null
                      ? ` · ${Number(item.duration_seconds).toFixed(1)}s`
                      : ""}
                    {` · ${item.storyboard.length} scene${item.storyboard.length === 1 ? "" : "s"}`}
                    {item.file_size != null
                      ? ` · ${formatBytes(item.file_size)}`
                      : ""}
                  </p>
                  {item.error_message ? (
                    <p className="mt-2 text-sm text-red-700">{item.error_message}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[item.status]}`}
                  >
                    {item.status}
                  </span>
                  {item.status === "ready" ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => play(item.id)}
                    >
                      {busy ? "Preparing…" : signedUrl ? "Reload player" : "Play"}
                    </button>
                  ) : null}
                </div>
              </div>
              {signedUrl ? (
                <video
                  key={signedUrl}
                  controls
                  autoPlay
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-black"
                  src={signedUrl}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
