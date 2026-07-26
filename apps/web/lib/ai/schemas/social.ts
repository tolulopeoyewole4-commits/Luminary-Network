import { z } from "zod";

import { sourceReferenceSchema } from "@/lib/ai/schemas/course";

export const SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "x",
  "youtube",
  "tiktok",
  "newsletter",
  "blog",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_TONES = [
  "professional",
  "warm",
  "bold",
  "conversational",
  "inspirational",
] as const;

export type SocialTone = (typeof SOCIAL_TONES)[number];

export const SOCIAL_LENGTHS = ["short", "medium", "long"] as const;
export type SocialLength = (typeof SOCIAL_LENGTHS)[number];

export const platformToContentType = {
  linkedin: "linkedin_post",
  instagram: "instagram_caption",
  x: "x_thread",
  youtube: "youtube_script",
  tiktok: "tiktok_script",
  newsletter: "newsletter",
  blog: "blog_outline",
} as const;

export type SocialContentType =
  (typeof platformToContentType)[SocialPlatform];

export const generatedSocialContentSchema = z.object({
  contentType: z.enum([
    "linkedin_post",
    "instagram_caption",
    "x_thread",
    "youtube_script",
    "tiktok_script",
    "newsletter",
    "blog_outline",
  ]),
  platform: z.enum(SOCIAL_PLATFORMS),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
});

export type GeneratedSocialContent = z.infer<
  typeof generatedSocialContentSchema
>;

export type SocialGenerationSection = {
  id: string;
  sectionTitle: string;
  sectionNumber: number;
  pageStart: number | null;
  pageEnd: number | null;
  extractedText: string;
};

export type SocialGenerationInput = {
  platform: SocialPlatform;
  tone: SocialTone;
  length: SocialLength;
  targetAudience: string;
  callToAction: string;
  outputCount: number;
  sections: SocialGenerationSection[];
};
