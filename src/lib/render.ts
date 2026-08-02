import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import type { StoryboardScene } from "./storyboard";

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;

// Register bundled system fonts so text renders identically across machines.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  const base = "/usr/share/fonts/truetype/dejavu";
  try {
    GlobalFonts.registerFromPath(path.join(base, "DejaVuSans.ttf"), "Sans");
    GlobalFonts.registerFromPath(path.join(base, "DejaVuSans-Bold.ttf"), "SansBold");
  } catch {
    // Fall back to whatever the canvas can find.
  }
  fontsRegistered = true;
}

// A small palette of pleasant gradients; scenes cycle through them.
const GRADIENTS: [string, string][] = [
  ["#0f172a", "#4338ca"],
  ["#111827", "#0e7490"],
  ["#1e1b4b", "#be185d"],
  ["#052e16", "#15803d"],
  ["#1c1917", "#b45309"],
  ["#082f49", "#7c3aed"],
];

function wrapText(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderSceneImage(
  scene: StoryboardScene,
  index: number,
  total: number,
  projectTitle: string,
): Buffer {
  ensureFonts();
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const [from, to] = GRADIENTS[index % GRADIENTS.length];
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle vignette for depth.
  const radial = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT / 6,
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT,
  );
  radial.addColorStop(0, "rgba(0,0,0,0)");
  radial.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Header / brand.
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "28px SansBold";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LUMINARY NETWORK", 60, 50);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "22px Sans";
  ctx.textAlign = "right";
  ctx.fillText(projectTitle, WIDTH - 60, 54);

  // Caption (centered, wrapped).
  ctx.fillStyle = "#ffffff";
  ctx.font = "52px SansBold";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxWidth = WIDTH - 200;
  const lines = wrapText(ctx, scene.caption, maxWidth);
  const lineHeight = 66;
  const blockHeight = lines.length * lineHeight;
  let y = HEIGHT / 2 - blockHeight / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, WIDTH / 2, y);
    y += lineHeight;
  }

  // Footer / scene counter.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "24px Sans";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`Scene ${index + 1} / ${total}`, 60, HEIGHT - 50);

  ctx.textAlign = "right";
  ctx.fillText(`${scene.durationSec.toFixed(1)}s`, WIDTH - 60, HEIGHT - 50);

  return canvas.toBuffer("image/png");
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export interface RenderResult {
  /** Public URL path for the generated file, e.g. /generated/<id>.mp4 */
  filePath: string;
  durationSec: number;
}

/**
 * Renders an ordered list of scenes into a single H.264 MP4 that plays in the
 * browser. Each scene becomes a still frame shown for its duration.
 */
export async function renderVideo(
  videoId: string,
  projectTitle: string,
  scenes: StoryboardScene[],
): Promise<RenderResult> {
  if (scenes.length === 0) {
    throw new Error("Cannot render a video with no scenes");
  }

  const workDir = path.join(os.tmpdir(), "luminary", videoId);
  const outputDir = path.join(process.cwd(), "public", "generated");
  await mkdir(workDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const segmentFiles: string[] = [];
  let totalDuration = 0;

  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const png = renderSceneImage(scene, i, scenes.length, projectTitle);
      const pngPath = path.join(workDir, `scene_${i}.png`);
      await writeFile(pngPath, png);

      const segPath = path.join(workDir, `seg_${i}.mp4`);
      await runFfmpeg([
        "-y",
        "-loop",
        "1",
        "-i",
        pngPath,
        "-t",
        String(scene.durationSec),
        "-r",
        String(FPS),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        `scale=${WIDTH}:${HEIGHT},format=yuv420p`,
        segPath,
      ]);
      segmentFiles.push(segPath);
      totalDuration += scene.durationSec;
    }

    // Concatenate all segments (identical codec params => stream copy is safe).
    const listPath = path.join(workDir, "concat.txt");
    const listContent = segmentFiles
      .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(listPath, listContent);

    const outputPath = path.join(outputDir, `${videoId}.mp4`);
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    return {
      filePath: `/generated/${videoId}.mp4`,
      durationSec: Number(totalDuration.toFixed(1)),
    };
  } finally {
    // Best-effort cleanup of the scratch directory.
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
