import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateVideoForm } from "@/components/CreateVideoForm";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { videos: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← All projects
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{project.title}</h1>
        {project.description && (
          <p className="mt-1 text-white/60">{project.description}</p>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_420px]">
        <div>
          <h2 className="font-semibold text-lg mb-4">
            Videos <span className="text-white/40">({project.videos.length})</span>
          </h2>
          {project.videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/50">
              No videos yet. Generate one from text or a script →
            </div>
          ) : (
            <ul className="space-y-3">
              {project.videos.map((video) => (
                <li key={video.id}>
                  <Link
                    href={`/videos/${video.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30 hover:bg-white/10"
                  >
                    <div>
                      <div className="font-medium">{video.title}</div>
                      <div className="mt-1 text-xs text-white/40">
                        {video.mode === "SCRIPT_TO_FILM"
                          ? "Script → Film"
                          : "Text → Video"}
                        {video.durationSec > 0 &&
                          ` · ${video.durationSec.toFixed(1)}s`}
                      </div>
                    </div>
                    <StatusBadge status={video.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 h-fit">
          <h2 className="font-semibold text-lg mb-4">Generate a video</h2>
          <CreateVideoForm projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
