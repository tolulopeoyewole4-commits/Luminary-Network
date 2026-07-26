import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProjectDangerZone } from "@/components/projects/ProjectDangerZone";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { Alert } from "@/components/ui/Alert";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

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

  const created = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(project.created_at));

  const updated = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(project.updated_at));

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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-muted">Status</p>
          <p className="mt-2 font-display text-2xl font-semibold capitalize">
            {project.status}
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

      <section className="surface-card px-6 py-6">
        <h2 className="font-display text-xl font-semibold">Next steps</h2>
        <p className="mt-2 text-sm text-muted">
          Source uploads arrive in Milestone 3. This project is ready to receive
          private PDFs, documents, and video once upload is enabled.
        </p>
        <button type="button" className="btn-secondary mt-4" disabled>
          Upload source (coming soon)
        </button>
      </section>

      <ProjectDangerZone projectId={project.id} status={project.status} />
    </div>
  );
}
