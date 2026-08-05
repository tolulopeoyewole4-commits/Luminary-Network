"use client";

import Link from "next/link";

import { useExportPresets } from "@/components/clips/ExportPresetContext";
import {
  ASPECT_RATIO_LABELS,
  CLIP_ASPECT_RATIOS,
  type ClipAspectRatio,
} from "@/lib/clips/export-presets";

type ExportPresetControlsProps = {
  projectId: string;
  sourceFileId: string;
};

export function ExportPresetControls({
  projectId,
  sourceFileId,
}: ExportPresetControlsProps) {
  const { presets, setPresets, hasCaptions, brandName } = useExportPresets();

  return (
    <section className="surface-card space-y-4 px-5 py-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          Reel export presets
        </h2>
        <p className="mt-1 text-sm text-muted">
          Frame approved clips for vertical social, burn captions, and stamp your
          creator identity before FFmpeg export.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="field-label">Aspect ratio</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CLIP_ASPECT_RATIOS.map((ratio) => {
            const selected = presets.aspectRatio === ratio;
            return (
              <label
                key={ratio}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl px-3 py-3 text-sm ring-1 transition ${
                  selected
                    ? "bg-[var(--accent-soft)] ring-[var(--accent)]"
                    : "bg-white/70 ring-[var(--border)] hover:bg-white"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <input
                    type="radio"
                    name="aspect-ratio"
                    className="accent-[var(--accent)]"
                    checked={selected}
                    onChange={() =>
                      setPresets({
                        ...presets,
                        aspectRatio: ratio as ClipAspectRatio,
                      })
                    }
                  />
                  {ratio === "original" ? "Original" : ratio}
                </span>
                <span className="pl-6 text-xs text-muted">
                  {ASPECT_RATIO_LABELS[ratio]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className={`flex items-start gap-3 rounded-xl px-3 py-3 text-sm ring-1 ${
            hasCaptions
              ? "bg-white/70 ring-[var(--border)]"
              : "bg-slate-50 ring-[var(--border)] opacity-80"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 accent-[var(--accent)]"
            checked={presets.burnCaptions}
            disabled={!hasCaptions}
            onChange={(event) =>
              setPresets({
                ...presets,
                burnCaptions: event.target.checked,
              })
            }
          />
          <span>
            <span className="block font-semibold text-foreground">
              Burn captions into video
            </span>
            <span className="mt-1 block text-xs text-muted">
              {hasCaptions ? (
                "Uses cue text that overlaps each clip window (karaoke-ready MP4)."
              ) : (
                <>
                  Generate captions first on the{" "}
                  <Link
                    href={`/projects/${projectId}/files/${sourceFileId}/captions`}
                    className="underline"
                  >
                    captions page
                  </Link>
                  .
                </>
              )}
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-xl px-3 py-3 text-sm ring-1 ${
            brandName
              ? "bg-white/70 ring-[var(--border)]"
              : "bg-slate-50 ring-[var(--border)] opacity-80"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 accent-[var(--accent)]"
            checked={presets.brandStamp}
            disabled={!brandName}
            onChange={(event) =>
              setPresets({
                ...presets,
                brandStamp: event.target.checked,
              })
            }
          />
          <span>
            <span className="block font-semibold text-foreground">
              Brand identity stamp
            </span>
            <span className="mt-1 block text-xs text-muted">
              {brandName ? (
                <>
                  Stamps “{brandName}” at the top of the frame from your{" "}
                  <Link href="/settings" className="underline">
                    profile display name
                  </Link>
                  .
                </>
              ) : (
                <>
                  Set a display name in{" "}
                  <Link href="/settings" className="underline">
                    settings
                  </Link>{" "}
                  to enable identity stamps.
                </>
              )}
            </span>
          </span>
        </label>
      </div>

      {presets.aspectRatio === "9:16" ? (
        <div className="flex justify-center">
          <div className="relative h-40 w-[90px] overflow-hidden rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 ring-1 ring-[var(--border)]">
            <div className="absolute inset-x-2 top-3 text-center text-[8px] font-semibold text-white/90">
              {brandName && presets.brandStamp ? brandName : "Brand"}
            </div>
            <div className="absolute inset-x-2 bottom-4 space-y-1">
              <div className="h-1.5 rounded bg-white/90" />
              <div className="h-1.5 w-4/5 rounded bg-white/70" />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
