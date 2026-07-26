import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/lib/ai/providers/mock";
import {
  hasSocialGeneratorErrors,
  validateSocialGeneratorInput,
} from "@/lib/content/validation";

describe("validateSocialGeneratorInput", () => {
  it("requires core fields", () => {
    const errors = validateSocialGeneratorInput({
      sourceFileId: "",
      sectionIds: [],
      platform: "myspace",
      tone: "chaotic",
      length: "infinite",
      targetAudience: "",
      callToAction: "",
      outputCount: 0,
    });
    expect(hasSocialGeneratorErrors(errors)).toBe(true);
    expect(errors.platform).toBeTruthy();
    expect(errors.sectionIds).toBeTruthy();
  });

  it("accepts a valid payload", () => {
    const errors = validateSocialGeneratorInput({
      sourceFileId: "file-1",
      sectionIds: ["sec-1"],
      platform: "linkedin",
      tone: "professional",
      length: "medium",
      targetAudience: "Creators",
      callToAction: "Share this with your team.",
      outputCount: 2,
    });
    expect(hasSocialGeneratorErrors(errors)).toBe(false);
  });
});

describe("MockAIProvider.generateSocialContent", () => {
  it("returns grounded outputs with source references", async () => {
    const provider = new MockAIProvider();
    const outputs = await provider.generateSocialContent({
      platform: "tiktok",
      tone: "bold",
      length: "short",
      targetAudience: "Young professionals",
      callToAction: "Follow for the next lesson.",
      outputCount: 2,
      sections: [
        {
          id: "sec-1",
          sectionTitle: "Clarity First",
          sectionNumber: 1,
          pageStart: 2,
          pageEnd: 2,
          extractedText:
            "Clarity turns scattered knowledge into teachable moments for any audience.",
        },
      ],
    });

    expect(outputs).toHaveLength(2);
    expect(outputs[0].contentType).toBe("tiktok_script");
    expect(outputs[0].sourceReferences[0].sectionId).toBe("sec-1");
    expect(outputs[0].body).toMatch(/Clarity First|Clarity turns/i);
    expect(outputs[0].body).toMatch(/Follow for the next lesson/);
  });

  it("rejects empty section selections", async () => {
    const provider = new MockAIProvider();
    await expect(
      provider.generateSocialContent({
        platform: "blog",
        tone: "warm",
        length: "long",
        targetAudience: "Readers",
        callToAction: "Subscribe",
        outputCount: 1,
        sections: [],
      }),
    ).rejects.toThrow(/at least one source section/i);
  });
});
