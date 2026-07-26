import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SocialGeneratorForm } from "@/components/content/SocialGeneratorForm";
import { ActiveGenerationStatus } from "@/components/jobs/ActiveGenerationStatus";
import { Alert } from "@/components/ui/Alert";
import { listReadyDocumentSectionsForProject } from "@/lib/courses/queries";
import { listRecentGenerationJobs } from "@/lib/jobs/queries";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

type NewContentPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Generate content",
};

export default async function NewContentPage({ params }: NewContentPageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { project, error } = await getOwnProject(supabase, projectId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!project) notFound();

  const [{ files, error: filesError }, generationJobs] = await Promise.all([
    listReadyDocumentSectionsForProject(supabase, projectId),
    listRecentGenerationJobs(supabase, projectId, "social_generate"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Content generator
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Generate social content
        </h1>
        <p className="mt-2 text-muted">
          Create LinkedIn posts, captions, threads, scripts, newsletters, and blog
          outlines grounded in your selected source sections.
        </p>
      </section>

      <ActiveGenerationStatus
        jobs={generationJobs}
        projectId={projectId}
        kind="social_generate"
      />

      {filesError ? <Alert tone="error">{filesError}</Alert> : null}
      <SocialGeneratorForm projectId={projectId} files={files} />
    </div>
  );
}
