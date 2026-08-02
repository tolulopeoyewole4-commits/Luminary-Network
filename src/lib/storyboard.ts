/**
 * Storyboard generation: turns raw user input (a short prompt or a full script)
 * into an ordered list of scenes that the render pipeline can turn into video.
 *
 * There are two providers:
 *  - "local"  (default): a deterministic heuristic that needs no external API.
 *  - "openai" (optional): used only when OPENAI_API_KEY is set. Falls back to
 *    the local provider on any error so the platform always works offline.
 */

export type StoryboardMode = "TEXT_TO_VIDEO" | "SCRIPT_TO_FILM";

export interface StoryboardScene {
  caption: string;
  durationSec: number;
}

export interface Storyboard {
  provider: "local" | "openai";
  scenes: StoryboardScene[];
}

const MIN_SCENE_SECONDS = 2.5;
const MAX_SCENE_SECONDS = 7;
const MAX_SCENES_TEXT = 8;
const MAX_SCENES_FILM = 20;
const MAX_CAPTION_CHARS = 220;

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Roughly a comfortable reading pace of ~3 words/second.
  const seconds = words / 3;
  return Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, Number(seconds.toFixed(1))));
}

function clampCaption(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CAPTION_CHARS) return clean;
  return clean.slice(0, MAX_CAPTION_CHARS - 1).trimEnd() + "…";
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Local, dependency-free storyboard heuristic.
 */
export function localStoryboard(input: string, mode: StoryboardMode): Storyboard {
  const trimmed = input.trim();
  const maxScenes = mode === "SCRIPT_TO_FILM" ? MAX_SCENES_FILM : MAX_SCENES_TEXT;

  let chunks: string[];

  if (mode === "SCRIPT_TO_FILM") {
    // Prefer explicit scene breaks / paragraphs, then fall back to sentences.
    const paragraphs = trimmed
      .split(/\n\s*\n|\n(?=(?:INT\.|EXT\.|SCENE\b))/i)
      .map((p) => p.trim())
      .filter(Boolean);
    chunks = paragraphs.length > 1 ? paragraphs : splitSentences(trimmed);
  } else {
    chunks = splitSentences(trimmed);
    if (chunks.length === 0 && trimmed) chunks = [trimmed];
  }

  if (chunks.length === 0) chunks = ["Untitled scene"];

  // If we have more chunks than allowed, merge neighbours so nothing is lost.
  if (chunks.length > maxScenes) {
    const merged: string[] = [];
    const groupSize = Math.ceil(chunks.length / maxScenes);
    for (let i = 0; i < chunks.length; i += groupSize) {
      merged.push(chunks.slice(i, i + groupSize).join(" "));
    }
    chunks = merged;
  }

  const scenes: StoryboardScene[] = chunks.map((chunk) => ({
    caption: clampCaption(chunk),
    durationSec: estimateDuration(chunk),
  }));

  return { provider: "local", scenes };
}

/**
 * Optional OpenAI-backed storyboard. Only invoked when OPENAI_API_KEY is set.
 * Returns null on any failure so callers can fall back to the local provider.
 */
async function openAiStoryboard(
  input: string,
  mode: StoryboardMode,
): Promise<Storyboard | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const maxScenes = mode === "SCRIPT_TO_FILM" ? MAX_SCENES_FILM : MAX_SCENES_TEXT;
  const system =
    "You are a video director. Break the user's request into a concise storyboard. " +
    "Respond ONLY with JSON of the form {\"scenes\":[{\"caption\":string,\"durationSec\":number}]}. " +
    `Use at most ${maxScenes} scenes. Keep each caption under ${MAX_CAPTION_CHARS} characters.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Mode: ${mode}. Request:\n${input}`,
          },
        ],
      }),
      // Do not let a slow API hang the render request forever.
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as {
      scenes?: { caption?: string; durationSec?: number }[];
    };
    const scenes = (parsed.scenes ?? [])
      .map((s) => ({
        caption: clampCaption(String(s.caption ?? "")),
        durationSec: Math.min(
          MAX_SCENE_SECONDS,
          Math.max(MIN_SCENE_SECONDS, Number(s.durationSec) || MIN_SCENE_SECONDS),
        ),
      }))
      .filter((s) => s.caption.length > 0)
      .slice(0, maxScenes);

    if (scenes.length === 0) return null;
    return { provider: "openai", scenes };
  } catch {
    return null;
  }
}

/**
 * Public entry point. Tries OpenAI when configured, otherwise (or on failure)
 * uses the deterministic local heuristic.
 */
export async function generateStoryboard(
  input: string,
  mode: StoryboardMode,
): Promise<Storyboard> {
  const viaOpenAi = await openAiStoryboard(input, mode);
  if (viaOpenAi) return viaOpenAi;
  return localStoryboard(input, mode);
}
