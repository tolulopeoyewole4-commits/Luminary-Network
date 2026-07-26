import { describe, expect, it } from "vitest";

import { MockAIProvider } from "@/lib/ai/providers/mock";
import {
  hasCourseGeneratorErrors,
  validateCourseGeneratorInput,
} from "@/lib/courses/validation";

describe("validateCourseGeneratorInput", () => {
  it("requires core generator fields", () => {
    const errors = validateCourseGeneratorInput({
      sourceFileId: "",
      sectionIds: [],
      targetAudience: "",
      courseObjective: "",
      durationLabel: "",
      moduleCount: 0,
      difficultyLevel: "expert",
    });
    expect(hasCourseGeneratorErrors(errors)).toBe(true);
    expect(errors.sourceFileId).toBeTruthy();
    expect(errors.sectionIds).toBeTruthy();
    expect(errors.difficultyLevel).toBeTruthy();
  });

  it("accepts a valid payload", () => {
    const errors = validateCourseGeneratorInput({
      sourceFileId: "file-1",
      sectionIds: ["section-1"],
      targetAudience: "Pastors",
      courseObjective: "Teach the material clearly",
      durationLabel: "3 weeks",
      moduleCount: 3,
      difficultyLevel: "beginner",
    });
    expect(hasCourseGeneratorErrors(errors)).toBe(false);
  });
});

describe("MockAIProvider", () => {
  it("grounds the outline in selected sections and includes references", async () => {
    const provider = new MockAIProvider();
    const outline = await provider.generateCourseOutline({
      targetAudience: "Coaches",
      courseObjective: "Turn the book into a practical course",
      durationLabel: "4 weeks",
      moduleCount: 2,
      difficultyLevel: "intermediate",
      sections: [
        {
          id: "sec-1",
          sectionTitle: "Foundations of Trust",
          sectionNumber: 1,
          pageStart: 1,
          pageEnd: 3,
          extractedText:
            "Trust is built through consistent action over time. Leaders earn trust slowly.",
        },
        {
          id: "sec-2",
          sectionTitle: "Practice Habits",
          sectionNumber: 2,
          pageStart: 4,
          pageEnd: 6,
          extractedText:
            "Daily habits convert intention into character. Practice beats intensity.",
        },
      ],
    });

    expect(outline.modules.length).toBe(2);
    expect(outline.sourceReferences).toHaveLength(2);
    expect(outline.modules[0].sourceReferences[0].sectionId).toBe("sec-1");
    expect(outline.description).toMatch(/selected source section/i);
    expect(outline.quizSuggestions[0]).toMatch(/Foundations of Trust/);
    expect(outline.groundingNotes.length).toBeGreaterThan(0);
  });

  it("rejects empty section selections", async () => {
    const provider = new MockAIProvider();
    await expect(
      provider.generateCourseOutline({
        targetAudience: "Students",
        courseObjective: "Learn",
        durationLabel: "1 week",
        moduleCount: 1,
        difficultyLevel: "beginner",
        sections: [],
      }),
    ).rejects.toThrow(/at least one source section/i);
  });
});
