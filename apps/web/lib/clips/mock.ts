import { formatTimestamp } from "@/lib/transcripts/mock";

export type MockClipCandidate = {
  title: string;
  reason: string;
  startTime: number;
  endTime: number;
  score: number;
  rank: number;
};

export type MockClipSegmentInput = {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string | null;
};

/**
 * Deterministic mock clip detection for MVP (no ML / scene detection API).
 * Prefers transcript windows; falls back to evenly spaced duration slices.
 */
export function buildMockClipCandidates(input: {
  durationSeconds: number;
  title?: string;
  segments?: MockClipSegmentInput[];
  maxCandidates?: number;
}): MockClipCandidate[] {
  const duration = Math.max(input.durationSeconds || 60, 20);
  const maxCandidates = Math.min(Math.max(input.maxCandidates ?? 5, 1), 8);
  const sourceTitle =
    input.title?.replace(/\.[^.]+$/, "").trim() || "this recording";

  if (input.segments && input.segments.length > 0) {
    return buildFromSegments({
      segments: input.segments,
      duration,
      sourceTitle,
      maxCandidates,
    });
  }

  return buildFromDuration({
    duration,
    sourceTitle,
    maxCandidates,
  });
}

function buildFromSegments(input: {
  segments: MockClipSegmentInput[];
  duration: number;
  sourceTitle: string;
  maxCandidates: number;
}): MockClipCandidate[] {
  const { segments, duration, sourceTitle, maxCandidates } = input;
  const candidates: MockClipCandidate[] = [];
  const step = Math.max(1, Math.floor(segments.length / maxCandidates));

  for (
    let i = 0;
    i < segments.length && candidates.length < maxCandidates;
    i += step
  ) {
    const startSeg = segments[i];
    const endSeg = segments[Math.min(i + 1, segments.length - 1)];
    const startTime = Number(Math.max(0, startSeg.startTime).toFixed(3));
    let endTime = Number(
      Math.min(duration, Math.max(endSeg.endTime, startTime + 12)).toFixed(3),
    );

    // Prefer short-form windows that fit Reels / Shorts / TikTok.
    if (endTime - startTime > 45) {
      endTime = Number((startTime + 45).toFixed(3));
    }
    if (endTime - startTime < 12) {
      endTime = Number(Math.min(duration, startTime + 15).toFixed(3));
    }
    if (endTime <= startTime) continue;

    const excerpt = startSeg.text.trim().slice(0, 90);
    const rank = candidates.length + 1;
    candidates.push({
      title: clipTitle(sourceTitle, rank, excerpt),
      reason: `Short-form hook around ${formatTimestamp(startTime)} for Reels/Shorts: “${excerpt}${excerpt.length >= 90 ? "…" : ""}”`,
      startTime,
      endTime,
      score: Number((0.92 - candidates.length * 0.05).toFixed(4)),
      rank,
    });
  }

  return candidates.length > 0
    ? candidates
    : buildFromDuration({ duration, sourceTitle, maxCandidates });
}

function buildFromDuration(input: {
  duration: number;
  sourceTitle: string;
  maxCandidates: number;
}): MockClipCandidate[] {
  const { duration, sourceTitle, maxCandidates } = input;
  // ~15–30s windows map cleanly to vertical social exports.
  const clipLength = Math.min(30, Math.max(15, Math.floor(duration / 6)));
  const gap = Math.max(
    clipLength,
    Math.floor(duration / Math.max(maxCandidates, 1)),
  );
  const candidates: MockClipCandidate[] = [];

  for (
    let start = 0;
    start < duration - 8 && candidates.length < maxCandidates;
    start += gap
  ) {
    const startTime = Number(start.toFixed(3));
    const endTime = Number(Math.min(duration, start + clipLength).toFixed(3));
    if (endTime <= startTime) break;
    const rank = candidates.length + 1;
    candidates.push({
      title: clipTitle(sourceTitle, rank),
      reason: `Evenly spaced Reels/Shorts window (${formatTimestamp(startTime)}–${formatTimestamp(endTime)}) ready for vertical export.`,
      startTime,
      endTime,
      score: Number((0.8 - candidates.length * 0.04).toFixed(4)),
      rank,
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      title: clipTitle(sourceTitle, 1),
      reason: "Fallback highlight covering the available recording.",
      startTime: 0,
      endTime: Number(Math.min(duration, 20).toFixed(3)),
      score: 0.75,
      rank: 1,
    });
  }

  return candidates;
}

function clipTitle(sourceTitle: string, rank: number, excerpt?: string): string {
  if (excerpt) {
    const words = excerpt.split(/\s+/).slice(0, 6).join(" ");
    return `Clip ${rank}: ${words}`;
  }
  return `Clip ${rank}: ${sourceTitle}`;
}

export { formatTimestamp };
