import { z } from "zod";

export const videoStoryboardModes = ["TEXT_TO_VIDEO", "SCRIPT_TO_FILM"] as const;
export type VideoStoryboardMode = (typeof videoStoryboardModes)[number];

export const storyboardSceneSchema = z.object({
  caption: z.string().min(1).max(400),
  durationSeconds: z.number().min(0.5).max(30),
});

export const videoStoryboardSchema = z.object({
  scenes: z.array(storyboardSceneSchema).min(1).max(30),
});

export type StoryboardScene = z.infer<typeof storyboardSceneSchema>;
export type VideoStoryboard = z.infer<typeof videoStoryboardSchema>;

export type VideoStoryboardInput = {
  title: string;
  mode: VideoStoryboardMode;
  sourceText: string;
};
