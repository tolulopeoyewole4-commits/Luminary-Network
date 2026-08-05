import type { CaptionCueInput } from "@/lib/captions/format";

export const CLIP_ASPECT_RATIOS = ["original", "9:16", "1:1"] as const;

export type ClipAspectRatio = (typeof CLIP_ASPECT_RATIOS)[number];

export type ClipExportPresets = {
  aspectRatio: ClipAspectRatio;
  burnCaptions: boolean;
  brandStamp: boolean;
};

export const DEFAULT_CLIP_EXPORT_PRESETS: ClipExportPresets = {
  aspectRatio: "9:16",
  burnCaptions: true,
  brandStamp: true,
};

export const ASPECT_RATIO_LABELS: Record<ClipAspectRatio, string> = {
  original: "Original",
  "9:16": "9:16 Reels / Shorts / TikTok",
  "1:1": "1:1 Square",
};

export function isClipAspectRatio(value: string): value is ClipAspectRatio {
  return (CLIP_ASPECT_RATIOS as readonly string[]).includes(value);
}

export function parseClipExportPresets(
  input: Partial<ClipExportPresets> | null | undefined,
): ClipExportPresets {
  const aspectRatio =
    input?.aspectRatio && isClipAspectRatio(input.aspectRatio)
      ? input.aspectRatio
      : DEFAULT_CLIP_EXPORT_PRESETS.aspectRatio;

  return {
    aspectRatio,
    burnCaptions: Boolean(input?.burnCaptions),
    brandStamp: Boolean(input?.brandStamp),
  };
}

/**
 * Slice absolute caption cues into a clip window with times relative to clip start.
 */
export function sliceCaptionsForClip(
  cues: Array<{ startTime: number; endTime: number; text: string }>,
  startTime: number,
  endTime: number,
): CaptionCueInput[] {
  if (endTime <= startTime) return [];

  const sliced: CaptionCueInput[] = [];
  for (const cue of cues) {
    const text = cue.text.trim();
    if (!text) continue;
    if (cue.endTime <= startTime || cue.startTime >= endTime) continue;

    const relativeStart = Math.max(0, cue.startTime - startTime);
    const relativeEnd = Math.min(endTime - startTime, cue.endTime - startTime);
    if (relativeEnd - relativeStart < 0.15) continue;

    sliced.push({
      startTime: Number(relativeStart.toFixed(3)),
      endTime: Number(relativeEnd.toFixed(3)),
      text,
    });
  }
  return sliced;
}

export function brandLabelFromProfile(profile: {
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
} | null): string | null {
  if (!profile) return null;
  const display = profile.display_name?.trim();
  if (display) return display;
  const fullName = profile.full_name?.trim();
  if (fullName) return fullName;
  const email = profile.email?.trim();
  if (email?.includes("@")) return email.split("@", 1)[0] || null;
  return null;
}

export function describeExportPresets(presets: ClipExportPresets): string {
  const parts = [ASPECT_RATIO_LABELS[presets.aspectRatio]];
  if (presets.burnCaptions) parts.push("burned captions");
  if (presets.brandStamp) parts.push("brand stamp");
  return parts.join(" · ");
}
