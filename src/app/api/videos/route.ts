import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateStoryboard } from "@/lib/storyboard";
import { renderVideo } from "@/lib/render";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(160),
  mode: z.enum(["TEXT_TO_VIDEO", "SCRIPT_TO_FILM"]),
  sourceText: z.string().min(1, "Please provide some text to generate from").max(20000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { projectId, title, mode, sourceText } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const video = await prisma.video.create({
    data: { projectId, title, mode, sourceText, status: "PROCESSING" },
  });

  try {
    const storyboard = await generateStoryboard(sourceText, mode);

    await prisma.scene.createMany({
      data: storyboard.scenes.map((scene, index) => ({
        videoId: video.id,
        index,
        caption: scene.caption,
        durationSec: scene.durationSec,
      })),
    });

    const result = await renderVideo(video.id, project.title, storyboard.scenes);

    const updated = await prisma.video.update({
      where: { id: video.id },
      data: {
        status: "READY",
        filePath: result.filePath,
        durationSec: result.durationSec,
      },
      include: { scenes: { orderBy: { index: "asc" } } },
    });

    return NextResponse.json(
      { video: updated, provider: storyboard.provider },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rendering failed";
    await prisma.video.update({
      where: { id: video.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return NextResponse.json({ error: message, videoId: video.id }, { status: 500 });
  }
}
