import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Project } from "@/types/database";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

type ProjectListProps = {
  projects: Project[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ProjectList({
  projects,
  emptyTitle = "No projects yet",
  emptyDescription = "Create a project to organise a book, PDF, course, or long-form video.",
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Link href="/projects/new" className="btn-primary">
            New project
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="surface-card block px-5 py-4 transition hover:bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {project.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {project.description || "No description yet."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ProjectTypeBadge type={project.project_type} />
                <ProjectStatusBadge status={project.status} />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Updated {formatDate(project.updated_at)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
