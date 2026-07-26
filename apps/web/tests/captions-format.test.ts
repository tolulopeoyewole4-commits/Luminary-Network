import { describe, expect, it } from "vitest";

import {
  buildCaptionCuesFromSegments,
  buildSrt,
  buildWebVtt,
  formatSrtTimestamp,
  formatVttTimestamp,
} from "@/lib/captions/format";

describe("caption timestamps", () => {
  it("formats vtt and srt timestamps", () => {
    expect(formatVttTimestamp(65.5)).toBe("00:01:05.500");
    expect(formatSrtTimestamp(65.5)).toBe("00:01:05,500");
  });
});

describe("caption builders", () => {
  it("builds webvtt and srt documents", () => {
    const cues = [
      { startTime: 0, endTime: 2.5, text: "Hello creators" },
      { startTime: 2.5, endTime: 5, text: "Publish everywhere" },
    ];

    const vtt = buildWebVtt(cues);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:02.500");
    expect(vtt).toContain("Hello creators");

    const srt = buildSrt(cues);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:02,500");
    expect(srt).toContain("Publish everywhere");
  });

  it("splits long transcript segments into readable cues", () => {
    const cues = buildCaptionCuesFromSegments({
      maxCharsPerCue: 20,
      segments: [
        {
          startTime: 0,
          endTime: 10,
          text: "This is a longer teaching sentence that should wrap into multiple cues.",
        },
      ],
    });

    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0].startTime).toBe(0);
    expect(cues.at(-1)?.endTime).toBeGreaterThan(cues[0].endTime);
    for (const cue of cues) {
      expect(cue.endTime).toBeGreaterThan(cue.startTime);
      expect(cue.text.length).toBeGreaterThan(0);
    }
  });
});
