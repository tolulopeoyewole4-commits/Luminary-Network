import { describe, expect, it } from "vitest";

import {
  buildMockTranscriptSegments,
  formatTimestamp,
} from "@/lib/transcripts/mock";

describe("buildMockTranscriptSegments", () => {
  it("covers the video duration with ordered non-overlapping segments", () => {
    const segments = buildMockTranscriptSegments({
      durationSeconds: 60,
      title: "teaching-clip.mp4",
    });

    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].startTime).toBe(0);
    expect(segments.at(-1)?.endTime).toBe(60);

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      expect(segment.endTime).toBeGreaterThanOrEqual(segment.startTime);
      expect(segment.text.trim().length).toBeGreaterThan(0);
      expect(segment.confidence).toBeGreaterThan(0);
      if (i > 0) {
        expect(segment.startTime).toBe(segments[i - 1].endTime);
      }
    }
  });

  it("clamps very short durations and still returns segments", () => {
    const segments = buildMockTranscriptSegments({
      durationSeconds: 1,
      title: "short",
    });
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].startTime).toBe(0);
    expect(segments.at(-1)?.endTime).toBeGreaterThanOrEqual(15);
  });
});

describe("formatTimestamp", () => {
  it("formats minutes and hours", () => {
    expect(formatTimestamp(65)).toBe("1:05");
    expect(formatTimestamp(3661)).toBe("1:01:01");
    expect(formatTimestamp(-3)).toBe("0:00");
  });
});
