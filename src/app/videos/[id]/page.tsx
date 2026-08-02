import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      project: true,
      scenes: { orderBy: { index: "asc" } },
    },
  });

  if (!video) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${video.projectId}`}
          className="text-sm text-white/50 hover:text-white"
        >
          ← {video.project.title}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{video.title}</h1>
          <StatusBadge status={video.status} />
        </div>
        <div className="mt-1 text-sm text-white/40">
          {video.mode === "SCRIPT_TO_FILM" ? "Script → Film" : "Text → Video"}
          {video.durationSec > 0 && ` · ${video.durationSec.toFixed(1)}s`}
          {` · ${video.scenes.length} scene${video.scenes.length === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {video.status === "READY" && video.filePath ? (
            <video
              key={video.filePath}
              controls
              className="w-full rounded-xl border border-white/10 bg-black"
              src={video.filePath}
            />
          ) : video.status === "FAILED" ? (
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-8 text-red-300">
              <p className="font-semibold">Rendering failed</p>
              <p className="mt-2 text-sm text-red-300/80">
                {video.errorMessage ?? "Unknown error"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-white/50">
              This video is still processing…
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold text-lg mb-4">Storyboard</h2>
          <ol className="space-y-3">
            {video.scenes.map((scene) => (
              <li
                key={scene.id}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Scene {scene.index + 1}</span>
                  <span>{scene.durationSec.toFixed(1)}s</span>
                </div>
                <p className="mt-1 text-sm text-white/80">{scene.caption}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
