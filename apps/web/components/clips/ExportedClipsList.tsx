"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { createExportedClipSignedUrlAction } from "@/lib/clips/export-actions";
import { describeExportPresets } from "@/lib/clips/export-presets";
import { formatTimestamp } from "@/lib/clips/mock";
import { formatBytes } from "@/lib/uploads/limits";
import type { ExportedClip } from "@/types/database";

type ExportedClipsListProps = {
  exports: ExportedClip[];
};

const STATUS_STYLES: Record<ExportedClip["status"], string> = {
  processing: "bg-sky-50 text-sky-800",
  ready: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  failed: "bg-red-50 text-red-800",
};

export function ExportedClipsList({ exports }: ExportedClipsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasProcessing = exports.some((item) => item.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [hasProcessing, router]);

  if (exports.length === 0) {
    return null;
  }

  function download(exportedClipId: string) {
    setError(null);
    setActiveId(exportedClipId);
    startTransition(async () => {
      const result = await createExportedClipSignedUrlAction(exportedClipId);
      setActiveId(null);
      if (!result.ok || !result.signedUrl) {
        setError(result.ok ? "Missing signed URL." : result.error);
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold">Exported reels</h2>
      <p className="text-sm text-muted">
        Private FFmpeg exports with optional vertical framing, burned captions,
        and brand stamps. Downloads use short-lived signed URLs.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="space-y-3">
        {exports.map((item) => {
          const busy = pending && activeId === item.id;
          return (
            <li key={item.id} className="surface-card px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {item.title || "Untitled clip"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatTimestamp(Number(item.start_time))} –{" "}
                    {formatTimestamp(Number(item.end_time))}
                    {item.duration_seconds != null
                      ? ` · ${Number(item.duration_seconds).toFixed(1)}s`
                      : ""}
                    {item.file_size != null
                      ? ` · ${formatBytes(item.file_size)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {describeExportPresets({
                      aspectRatio: item.aspect_ratio ?? "original",
                      burnCaptions: Boolean(item.burn_captions),
                      brandStamp: Boolean(item.brand_stamp),
                    })}
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
                      onClick={() => download(item.id)}
                    >
                      {busy ? "Preparing…" : "Secure download"}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
