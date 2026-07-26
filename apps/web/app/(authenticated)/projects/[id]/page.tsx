import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProjectDangerZone } from "@/components/projects/ProjectDangerZone";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { Alert } from "@/components/ui/Alert";
import { SourceFileList } from "@/components/uploads/SourceFileList";
import { SourceUploadForm } from "@/components/uploads/SourceUploadForm";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { listProjectSourceFiles } from "@/lib/uploads/queries";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { project } = await getOwnProject(supabase, id);
  return {
    title: project?.name ?? "Project",
  };
}

export default async function ProjectOverviewPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { project, error } = await getOwnProject(supabase, id);

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!project) {
    notFound();
  }

  const { files, error: filesError } = await listProjectSourceFiles(
    supabase,
    project.id,
  );

  const created = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(project.created_at));

  const updated = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(project.updated_at));

  const uploadDisabled = project.status === "archived";

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Project overview
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            {project.description || "No description yet."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ProjectTypeBadge type={project.project_type} />
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        <Link href={`/projects/${project.id}/edit`} className="btn-primary">
          Edit project
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Status</p>
          <p className="mt-2 font-display text-2xl font-semibold capitalize">
            {project.status}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Source files</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {files.length}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Created</p>
          <p className="mt-2 text-sm font-medium">{created}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Last updated</p>
          <p className="mt-2 text-sm font-medium">{updated}</p>
        </div>
      </section>

      <SourceUploadForm projectId={project.id} disabled={uploadDisabled} />

      {uploadDisabled ? (
        <Alert tone="info">
          This project is archived. Restore it before uploading new source files.
        </Alert>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Source library</h2>
        </div>
        {filesError ? <Alert tone="error">{filesError}</Alert> : null}
        <SourceFileList files={files} projectId={project.id} />
      </section>

      <ProjectDangerZone projectId={project.id} status={project.status} />
    </div>
  );
}
