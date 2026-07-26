import type { CourseGenerationInput } from "@/lib/ai/schemas/course";

/**
 * Prompt text is kept separate from UI code for future paid providers.
 * The mock provider uses the same grounding rules without calling an API.
 */
export function buildCourseOutlinePrompt(input: CourseGenerationInput): string {
  const sectionBlock = input.sections
    .map((section) => {
      const pages =
        section.pageStart == null
          ? "pages unknown"
          : section.pageEnd && section.pageEnd !== section.pageStart
            ? `pages ${section.pageStart}-${section.pageEnd}`
            : `page ${section.pageStart}`;

      return [
        `### Section ${section.sectionNumber}: ${section.sectionTitle}`,
        `id: ${section.id}`,
        pages,
        section.extractedText.slice(0, 2500),
      ].join("\n");
    })
    .join("\n\n");

  return `
You are generating a course outline for Luminary AI.

Hard rules:
- Use ONLY the provided source sections.
- Every module and lesson must include sourceReferences pointing to those sections.
- Do not invent facts, stories, statistics, or claims absent from the source text.
- If the source is thin, keep summaries short and note grounding limitations.

Creator inputs:
- Target audience: ${input.targetAudience}
- Course objective: ${input.courseObjective}
- Duration: ${input.durationLabel}
- Desired modules: ${input.moduleCount}
- Difficulty: ${input.difficultyLevel}

Source sections:
${sectionBlock}
`.trim();
}
