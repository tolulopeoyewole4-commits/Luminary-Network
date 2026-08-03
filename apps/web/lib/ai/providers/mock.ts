import { buildCourseOutlinePrompt } from "@/lib/ai/prompts/course-outline";
import { buildSocialContentPrompt } from "@/lib/ai/prompts/social-content";
import { buildVideoStoryboardPrompt } from "@/lib/ai/prompts/video-storyboard";
import {
  courseOutlineSchema,
  type CourseGenerationInput,
  type CourseGenerationSection,
  type CourseOutline,
  type SourceReference,
} from "@/lib/ai/schemas/course";
import {
  generatedSocialContentSchema,
  platformToContentType,
  type GeneratedSocialContent,
  type SocialGenerationInput,
  type SocialLength,
  type SocialPlatform,
} from "@/lib/ai/schemas/social";
import {
  videoStoryboardSchema,
  type VideoStoryboard,
  type VideoStoryboardInput,
} from "@/lib/ai/schemas/video";
import type { AIProvider } from "@/lib/ai/providers/types";

const MIN_SCENE_SECONDS = 2.5;
const MAX_SCENE_SECONDS = 7;
const MAX_SCENES_TEXT = 8;
const MAX_SCENES_FILM = 20;
const MAX_CAPTION_CHARS = 220;

function clampCaption(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CAPTION_CHARS) return clean;
  return `${clean.slice(0, MAX_CAPTION_CHARS - 1).trimEnd()}…`;
}

function estimateSceneDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = words / 3; // ~3 words/second reading pace
  return Number(
    Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, seconds)).toFixed(1),
  );
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toReference(section: CourseGenerationSection): SourceReference {
  return {
    sectionId: section.id,
    sectionTitle: section.sectionTitle,
    sectionNumber: section.sectionNumber,
    pageStart: section.pageStart,
    pageEnd: section.pageEnd,
  };
}

function firstSentence(text: string, fallback: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  const match = cleaned.match(/^(.{20,220}?[.!?])\s/);
  if (match) return match[1];
  return cleaned.slice(0, 220);
}

function chunkSections(
  sections: CourseGenerationSection[],
  moduleCount: number,
): CourseGenerationSection[][] {
  const count = Math.max(1, Math.min(moduleCount, sections.length));
  const groups: CourseGenerationSection[][] = Array.from(
    { length: count },
    () => [],
  );

  sections.forEach((section, index) => {
    groups[index % count].push(section);
  });

  return groups.filter((group) => group.length > 0);
}

/**
 * Deterministic mock generator.
 * Grounds titles/summaries in selected section text and always attaches references.
 */
export class MockAIProvider implements AIProvider {
  async generateCourseOutline(
    input: CourseGenerationInput,
  ): Promise<CourseOutline> {
    // Keep prompt construction in the path so future providers share it.
    void buildCourseOutlinePrompt(input);

    if (input.sections.length === 0) {
      throw new Error("Select at least one source section before generating.");
    }

    const groups = chunkSections(input.sections, input.moduleCount);
    const allRefs = input.sections.map(toReference);
    const primary = input.sections[0];

    const modules = groups.map((group, moduleIndex) => {
      const moduleRefs = group.map(toReference);
      const lead = group[0];
      const support = group.slice(1);

      const lessons = [
        {
          title: `Understand: ${lead.sectionTitle}`,
          summary: firstSentence(
            lead.extractedText,
            `Review the source material in ${lead.sectionTitle}.`,
          ),
          learningObjectives: [
            `Explain the key idea from ${lead.sectionTitle}.`,
            `Identify how this idea serves ${input.targetAudience}.`,
          ],
          sourceReferences: [toReference(lead)],
        },
        ...support.slice(0, 2).map((section) => ({
          title: `Apply: ${section.sectionTitle}`,
          summary: firstSentence(
            section.extractedText,
            `Apply teaching points from ${section.sectionTitle}.`,
          ),
          learningObjectives: [
            `Apply one practical takeaway from ${section.sectionTitle}.`,
          ],
          sourceReferences: [toReference(section)],
        })),
      ];

      return {
        title: `Module ${moduleIndex + 1}: ${lead.sectionTitle}`,
        description: firstSentence(
          lead.extractedText,
          `This module is grounded in ${lead.sectionTitle}.`,
        ),
        lessons,
        sourceReferences: moduleRefs,
      };
    });

    const learningOutcomes = [
      `Describe the core message drawn from ${primary.sectionTitle}.`,
      `Apply the teaching points for ${input.targetAudience}.`,
      `Connect selected source sections into a coherent learning path.`,
    ];

    if (input.difficultyLevel === "advanced") {
      learningOutcomes.push(
        "Critique and adapt the source ideas for advanced learners.",
      );
    }

    const quizSuggestions = input.sections.slice(0, 5).map((section) => {
      const snippet = firstSentence(
        section.extractedText,
        section.sectionTitle,
      );
      return `Based on ${section.sectionTitle}: what is the main idea behind “${snippet.slice(0, 80)}”?`;
    });

    const outline = {
      title: `${primary.sectionTitle} Course`,
      description: [
        `A ${input.difficultyLevel} course for ${input.targetAudience}.`,
        `Objective: ${input.courseObjective}.`,
        `Duration focus: ${input.durationLabel}.`,
        `Content is structured only from the ${input.sections.length} selected source section(s).`,
      ].join(" "),
      targetAudience: input.targetAudience,
      learningOutcomes,
      modules,
      quizSuggestions,
      sourceReferences: allRefs,
      groundingNotes: [
        "Generated by the mock AI provider using only selected source sections.",
        "No external facts were added beyond the creator inputs and source text.",
      ],
    };

    return courseOutlineSchema.parse(outline);
  }

  async generateSocialContent(
    input: SocialGenerationInput,
  ): Promise<GeneratedSocialContent[]> {
    void buildSocialContentPrompt(input);

    if (input.sections.length === 0) {
      throw new Error("Select at least one source section before generating.");
    }

    const count = Math.max(1, Math.min(input.outputCount, 5));
    const outputs: GeneratedSocialContent[] = [];

    for (let index = 0; index < count; index += 1) {
      const section = input.sections[index % input.sections.length];
      const idea = firstSentence(
        section.extractedText,
        `Key idea from ${section.sectionTitle}`,
      );
      const body = buildMockSocialBody({
        platform: input.platform,
        tone: input.tone,
        length: input.length,
        targetAudience: input.targetAudience,
        callToAction: input.callToAction,
        sectionTitle: section.sectionTitle,
        idea,
        variant: index + 1,
      });

      outputs.push(
        generatedSocialContentSchema.parse({
          contentType: platformToContentType[input.platform],
          platform: input.platform,
          title: `${labelPlatform(input.platform)} from ${section.sectionTitle} (#${index + 1})`,
          body,
          sourceReferences: [toReference(section)],
        }),
      );
    }

    return outputs;
  }

  async generateVideoStoryboard(
    input: VideoStoryboardInput,
  ): Promise<VideoStoryboard> {
    // Keep prompt construction in the path so future providers share it.
    void buildVideoStoryboardPrompt(input);

    const trimmed = input.sourceText.trim();
    if (!trimmed) {
      throw new Error("Provide some text to generate a video from.");
    }

    const maxScenes =
      input.mode === "SCRIPT_TO_FILM" ? MAX_SCENES_FILM : MAX_SCENES_TEXT;

    let chunks: string[];
    if (input.mode === "SCRIPT_TO_FILM") {
      const paragraphs = trimmed
        .split(/\n\s*\n|\n(?=(?:INT\.|EXT\.|SCENE\b))/i)
        .map((p) => p.trim())
        .filter(Boolean);
      chunks = paragraphs.length > 1 ? paragraphs : splitSentences(trimmed);
    } else {
      chunks = splitSentences(trimmed);
      if (chunks.length === 0) chunks = [trimmed];
    }

    if (chunks.length === 0) chunks = [trimmed];

    // Merge neighbours if we exceed the scene budget so no text is dropped.
    if (chunks.length > maxScenes) {
      const groupSize = Math.ceil(chunks.length / maxScenes);
      const merged: string[] = [];
      for (let i = 0; i < chunks.length; i += groupSize) {
        merged.push(chunks.slice(i, i + groupSize).join(" "));
      }
      chunks = merged;
    }

    const scenes = chunks.map((chunk) => ({
      caption: clampCaption(chunk),
      durationSeconds: estimateSceneDuration(chunk),
    }));

    return videoStoryboardSchema.parse({ scenes });
  }
}

function labelPlatform(platform: SocialPlatform): string {
  switch (platform) {
    case "linkedin":
      return "LinkedIn post";
    case "instagram":
      return "Instagram caption";
    case "x":
      return "X thread";
    case "youtube":
      return "YouTube script";
    case "tiktok":
      return "TikTok / Reel script";
    case "newsletter":
      return "Newsletter";
    case "blog":
      return "Blog outline";
    default:
      return "Content";
  }
}

function lengthBudget(length: SocialLength): number {
  if (length === "short") return 280;
  if (length === "long") return 1200;
  return 600;
}

function buildMockSocialBody(input: {
  platform: SocialPlatform;
  tone: string;
  length: SocialLength;
  targetAudience: string;
  callToAction: string;
  sectionTitle: string;
  idea: string;
  variant: number;
}): string {
  const budget = lengthBudget(input.length);
  const opener = `${input.idea}`;

  if (input.platform === "x") {
    const tweets = [
      `1/${Math.min(3, input.variant + 2)} For ${input.targetAudience}: ${opener}`,
      `2/ Grounded in “${input.sectionTitle}”. Tone: ${input.tone}.`,
      `3/ ${input.callToAction}`,
    ];
    return tweets.join("\n\n").slice(0, budget + 120);
  }

  if (input.platform === "youtube" || input.platform === "tiktok") {
    return [
      `HOOK: ${opener}`,
      `CONTEXT: This script is grounded in “${input.sectionTitle}”.`,
      `BODY: Speak to ${input.targetAudience} in a ${input.tone} voice. Stay faithful to the source idea above — do not invent extra claims.`,
      `CTA: ${input.callToAction}`,
    ]
      .join("\n\n")
      .slice(0, budget + 200);
  }

  if (input.platform === "blog") {
    return [
      `Outline (variant ${input.variant})`,
      `1. Introduction — ${opener}`,
      `2. Core teaching from “${input.sectionTitle}”`,
      `3. Practical application for ${input.targetAudience}`,
      `4. Closing CTA — ${input.callToAction}`,
      ``,
      `Notes: Keep every claim traceable to the selected source section.`,
    ].join("\n");
  }

  if (input.platform === "newsletter") {
    return [
      `Subject angle: ${input.sectionTitle}`,
      ``,
      `Hello ${input.targetAudience},`,
      ``,
      opener,
      ``,
      `This edition stays close to the source material in “${input.sectionTitle}”.`,
      ``,
      input.callToAction,
    ]
      .join("\n")
      .slice(0, budget + 200);
  }

  // LinkedIn / Instagram default
  return [
    opener,
    ``,
    `Drawn from “${input.sectionTitle}” for ${input.targetAudience}.`,
    `Voice: ${input.tone}.`,
    ``,
    input.callToAction,
  ]
    .join("\n")
    .slice(0, budget + 80);
}

