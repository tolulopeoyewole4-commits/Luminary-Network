import type { VideoStoryboardInput } from "@/lib/ai/schemas/video";

/**
 * Prompt builder kept in the generation path so future real providers
 * (beyond the deterministic mock) share the same instruction contract.
 */
export function buildVideoStoryboardPrompt(input: VideoStoryboardInput): string {
  const guidance =
    input.mode === "SCRIPT_TO_FILM"
      ? "Treat the input as a script. Split it into ordered film scenes, preferring blank lines and INT./EXT. headings as boundaries."
      : "Treat the input as a prompt/description. Break it into short, ordered scenes (roughly one idea per scene).";

  return [
    "You are a video director building a storyboard.",
    guidance,
    "For each scene provide a concise on-screen caption and a duration in seconds.",
    `Title: ${input.title || "Untitled video"}`,
    "Source:",
    input.sourceText,
  ].join("\n");
}
