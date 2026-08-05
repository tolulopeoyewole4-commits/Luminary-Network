import { describe, expect, it } from "vitest";

import { buildMockClipCandidates } from "@/lib/clips/mock";

describe("buildMockClipCandidates", () => {
  it("builds duration-based candidates with valid windows", () => {
    const clips = buildMockClipCandidates({
      durationSeconds: 120,
      title: "teaching-session.mp4",
      maxCandidates: 4,
    });

    expect(clips.length).toBeGreaterThan(0);
    expect(clips.length).toBeLessThanOrEqual(4);

    for (const clip of clips) {
      expect(clip.endTime).toBeGreaterThan(clip.startTime);
      expect(clip.title.length).toBeGreaterThan(0);
      expect(clip.reason.length).toBeGreaterThan(0);
      expect(clip.score).toBeGreaterThan(0);
      expect(clip.rank).toBeGreaterThan(0);
    }
  });

  it("prefers transcript segments when provided", () => {
    const clips = buildMockClipCandidates({
      durationSeconds: 90,
      title: "lesson.mov",
      maxCandidates: 3,
      segments: [
        {
          startTime: 0,
          endTime: 10,
          text: "Welcome to the core idea for today's teaching point.",
        },
        {
          startTime: 10,
          endTime: 22,
          text: "Here is the practical example learners remember.",
        },
        {
          startTime: 40,
          endTime: 55,
          text: "Close with a clear call to action.",
        },
      ],
    });

    expect(clips.length).toBeGreaterThan(0);
    expect(clips[0].reason.toLowerCase()).toMatch(/short-form|reels|shorts/);
    expect(clips[0].startTime).toBe(0);
  });
});
