import {
  SOCIAL_LENGTHS,
  SOCIAL_PLATFORMS,
  SOCIAL_TONES,
} from "@/lib/ai/schemas/social";

export type SocialGeneratorFieldErrors = {
  sourceFileId?: string;
  sectionIds?: string;
  platform?: string;
  tone?: string;
  length?: string;
  targetAudience?: string;
  callToAction?: string;
  outputCount?: string;
};

export function validateSocialGeneratorInput(input: {
  sourceFileId: string;
  sectionIds: string[];
  platform: string;
  tone: string;
  length: string;
  targetAudience: string;
  callToAction: string;
  outputCount: number;
}): SocialGeneratorFieldErrors {
  const errors: SocialGeneratorFieldErrors = {};

  if (!input.sourceFileId.trim()) {
    errors.sourceFileId = "Select a source document.";
  }
  if (input.sectionIds.length === 0) {
    errors.sectionIds = "Select at least one chapter or section.";
  }
  if (!(SOCIAL_PLATFORMS as readonly string[]).includes(input.platform)) {
    errors.platform = "Select a valid platform.";
  }
  if (!(SOCIAL_TONES as readonly string[]).includes(input.tone)) {
    errors.tone = "Select a valid tone.";
  }
  if (!(SOCIAL_LENGTHS as readonly string[]).includes(input.length)) {
    errors.length = "Select a valid length.";
  }
  if (!input.targetAudience.trim()) {
    errors.targetAudience = "Target audience is required.";
  }
  if (!input.callToAction.trim()) {
    errors.callToAction = "Call to action is required.";
  }
  if (
    !Number.isFinite(input.outputCount) ||
    input.outputCount < 1 ||
    input.outputCount > 5
  ) {
    errors.outputCount = "Choose between 1 and 5 outputs.";
  }

  return errors;
}

export function hasSocialGeneratorErrors(
  errors: SocialGeneratorFieldErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}
