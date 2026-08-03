import {
  videoStoryboardModes,
  type VideoStoryboardMode,
} from "@/lib/ai/schemas/video";

export type VideoGenerateFieldErrors = {
  title?: string;
  mode?: string;
  sourceText?: string;
};

export type VideoGenerateInput = {
  title: string;
  mode: VideoStoryboardMode;
  sourceText: string;
};

export const MAX_SOURCE_TEXT_CHARS = 20000;
export const MAX_TITLE_CHARS = 200;

export function validateVideoGenerateInput(
  input: VideoGenerateInput,
): VideoGenerateFieldErrors {
  const errors: VideoGenerateFieldErrors = {};
  const title = input.title.trim();
  const sourceText = input.sourceText.trim();

  if (!title) {
    errors.title = "Give your video a title.";
  } else if (title.length > MAX_TITLE_CHARS) {
    errors.title = `Title must be ${MAX_TITLE_CHARS} characters or fewer.`;
  }

  if (!(videoStoryboardModes as readonly string[]).includes(input.mode)) {
    errors.mode = "Choose a valid generation mode.";
  }

  if (!sourceText) {
    errors.sourceText =
      input.mode === "SCRIPT_TO_FILM"
        ? "Paste a script to turn into a film."
        : "Enter a prompt to turn into a video.";
  } else if (sourceText.length > MAX_SOURCE_TEXT_CHARS) {
    errors.sourceText = `Keep the text under ${MAX_SOURCE_TEXT_CHARS} characters.`;
  }

  return errors;
}

export function hasVideoGenerateErrors(
  errors: VideoGenerateFieldErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}
