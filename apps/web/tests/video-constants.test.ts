import { describe, expect, it } from "vitest";

import { VIDEO_FILE_TYPES } from "@/lib/uploads/constants";

describe("video file types", () => {
  it("supports mp4 and mov for processing jobs", () => {
    expect(VIDEO_FILE_TYPES).toEqual(["mp4", "mov"]);
  });
});
