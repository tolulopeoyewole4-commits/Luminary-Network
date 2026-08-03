import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/lib/ai/providers/mock";

const provider = new MockAIProvider();

describe("MockAIProvider.generateVideoStoryboard", () => {
  it("splits a prompt into one scene per sentence (text mode)", async () => {
    const storyboard = await provider.generateVideoStoryboard({
      title: "Ocean",
      mode: "TEXT_TO_VIDEO",
      sourceText:
        "A calm morning by the ocean. The sun rises slowly. Waves roll onto the shore.",
    });
    expect(storyboard.scenes).toHaveLength(3);
    expect(storyboard.scenes[0].caption).toBe("A calm morning by the ocean.");
    expect(storyboard.scenes.every((s) => s.durationSeconds >= 2.5)).toBe(true);
  });

  it("splits a script on scene headings (film mode)", async () => {
    const storyboard = await provider.generateVideoStoryboard({
      title: "Short film",
      mode: "SCRIPT_TO_FILM",
      sourceText:
        "EXT. CITY - DAY\n\nA traveler arrives.\n\nINT. CAFE - LATER\n\nShe opens a notebook.",
    });
    expect(storyboard.scenes.length).toBeGreaterThanOrEqual(2);
  });

  it("caps the number of scenes by merging in text mode", async () => {
    const manySentences = Array.from(
      { length: 40 },
      (_, i) => `Sentence number ${i + 1}.`,
    ).join(" ");
    const storyboard = await provider.generateVideoStoryboard({
      title: "Many",
      mode: "TEXT_TO_VIDEO",
      sourceText: manySentences,
    });
    expect(storyboard.scenes.length).toBeLessThanOrEqual(8);
  });

  it("throws on empty input", async () => {
    await expect(
      provider.generateVideoStoryboard({
        title: "Empty",
        mode: "TEXT_TO_VIDEO",
        sourceText: "   ",
      }),
    ).rejects.toThrow(/Provide some text/);
  });
});
