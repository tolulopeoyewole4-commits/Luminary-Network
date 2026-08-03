import { describe, expect, it } from "vitest";

import {
  hasVideoGenerateErrors,
  validateVideoGenerateInput,
} from "@/lib/videos/validation";

describe("validateVideoGenerateInput", () => {
  it("accepts a valid text-to-video request", () => {
    const errors = validateVideoGenerateInput({
      title: "Neon City",
      mode: "TEXT_TO_VIDEO",
      sourceText: "A neon city wakes at midnight.",
    });
    expect(hasVideoGenerateErrors(errors)).toBe(false);
  });

  it("requires a title", () => {
    const errors = validateVideoGenerateInput({
      title: "   ",
      mode: "TEXT_TO_VIDEO",
      sourceText: "Some text.",
    });
    expect(errors.title).toBeTruthy();
    expect(hasVideoGenerateErrors(errors)).toBe(true);
  });

  it("requires source text with a mode-specific message", () => {
    const textErrors = validateVideoGenerateInput({
      title: "Title",
      mode: "TEXT_TO_VIDEO",
      sourceText: "",
    });
    expect(textErrors.sourceText).toMatch(/prompt/i);

    const filmErrors = validateVideoGenerateInput({
      title: "Title",
      mode: "SCRIPT_TO_FILM",
      sourceText: "",
    });
    expect(filmErrors.sourceText).toMatch(/script/i);
  });

  it("rejects an invalid mode", () => {
    const errors = validateVideoGenerateInput({
      title: "Title",
      // @ts-expect-error testing invalid mode at runtime
      mode: "BOGUS",
      sourceText: "Some text.",
    });
    expect(errors.mode).toBeTruthy();
  });
});
