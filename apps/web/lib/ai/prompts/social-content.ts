import type { SocialGenerationInput } from "@/lib/ai/schemas/social";

export function buildSocialContentPrompt(input: SocialGenerationInput): string {
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
        section.extractedText.slice(0, 1800),
      ].join("\n");
    })
    .join("\n\n");

  return `
Generate ${input.outputCount} ${input.platform} content piece(s) for Luminary AI.

Hard rules:
- Use ONLY the provided source sections.
- Attach sourceReferences for every output.
- Do not invent unsupported claims, quotes, or statistics.
- Match tone (${input.tone}), length (${input.length}), audience, and CTA.

Audience: ${input.targetAudience}
Call to action: ${input.callToAction}

Source sections:
${sectionBlock}
`.trim();
}
