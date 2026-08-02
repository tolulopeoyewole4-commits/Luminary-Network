import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerateVideoForm } from "@/components/videos/GenerateVideoForm";
import { GeneratedVideosList } from "@/components/videos/GeneratedVideosList";
import { ProcessingJobsList } from "@/components/jobs/ProcessingJobsList";
import { Alert } from "@/components/ui/Alert";
import { listRecentGenerationJobs } from "@/lib/jobs/queries";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { listProjectGeneratedVideos } from "@/lib/videos/queries";

type ProjectVideosPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "AI videos",
};

export default async function ProjectVideosPage({
  params,
}: ProjectVideosPageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { project, error } = await getOwnProject(supabase, projectId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!project) notFound();

  const [{ videos, error: videosError }, jobs] = await Promise.all([
    listProjectGeneratedVideos(supabase, projectId),
    listRecentGenerationJobs(supabase, projectId, "video_generate"),
  ]);

  const uploadDisabled = project.status === "archived";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {project.name}
        </Link>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-accent">
          AI video studio
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Create video from text
        </h1>
        <p className="mt-2 text-muted">
          Turn a prompt into a video or a script into a full film. Each scene is
          rendered to a real MP4 with FFmpeg and stored privately in your project.
        </p>
      </section>

      {uploadDisabled ? (
        <Alert tone="info">
          This project is archived. Restore it before generating new videos.
        </Alert>
      ) : null}

      <GenerateVideoForm projectId={projectId} disabled={uploadDisabled} />

      {jobs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Generation jobs</h2>
          <ProcessingJobsList
            jobs={jobs}
            emptyDescription="Video generation jobs will appear here."
          />
        </section>
      ) : null}

      {videosError ? <Alert tone="error">{videosError}</Alert> : null}
      <GeneratedVideosList videos={videos} />
    </div>
  );
}
