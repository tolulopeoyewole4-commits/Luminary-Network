import { describe, expect, it } from "vitest";

import {
  brandLabelFromProfile,
  DEFAULT_CLIP_EXPORT_PRESETS,
  describeExportPresets,
  parseClipExportPresets,
  sliceCaptionsForClip,
} from "@/lib/clips/export-presets";

describe("parseClipExportPresets", () => {
  it("defaults to vertical reel-friendly presets", () => {
    expect(DEFAULT_CLIP_EXPORT_PRESETS.aspectRatio).toBe("9:16");
    expect(parseClipExportPresets(undefined).aspectRatio).toBe("9:16");
  });

  it("rejects unknown aspect ratios", () => {
    expect(
      parseClipExportPresets({
        aspectRatio: "4:5" as never,
        burnCaptions: true,
        brandStamp: false,
      }).aspectRatio,
    ).toBe("9:16");
  });
});

describe("sliceCaptionsForClip", () => {
  it("rewrites overlapping cues relative to clip start", () => {
    const sliced = sliceCaptionsForClip(
      [
        { startTime: 8, endTime: 12, text: "Before" },
        { startTime: 14, endTime: 18, text: "Hook line" },
        { startTime: 30, endTime: 34, text: "After" },
      ],
      10,
      20,
    );

    expect(sliced).toEqual([
      { startTime: 0, endTime: 2, text: "Before" },
      { startTime: 4, endTime: 8, text: "Hook line" },
    ]);
  });

  it("drops cues that barely touch the window", () => {
    expect(
      sliceCaptionsForClip(
        [{ startTime: 9.95, endTime: 10.05, text: "Tiny" }],
        10,
        20,
      ),
    ).toEqual([]);
  });
});

describe("brandLabelFromProfile", () => {
  it("prefers display name then full name then email local-part", () => {
    expect(
      brandLabelFromProfile({
        display_name: "Ada",
        full_name: "Ada Lovelace",
        email: "ada@example.com",
      }),
    ).toBe("Ada");
    expect(
      brandLabelFromProfile({
        display_name: null,
        full_name: "Ada Lovelace",
        email: "ada@example.com",
      }),
    ).toBe("Ada Lovelace");
    expect(
      brandLabelFromProfile({
        display_name: "  ",
        full_name: null,
        email: "ada@example.com",
      }),
    ).toBe("ada");
  });
});

describe("describeExportPresets", () => {
  it("summarizes selected options", () => {
    expect(
      describeExportPresets({
        aspectRatio: "9:16",
        burnCaptions: true,
        brandStamp: true,
      }),
    ).toContain("9:16");
  });
});
