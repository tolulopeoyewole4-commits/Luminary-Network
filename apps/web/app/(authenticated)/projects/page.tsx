import Link from "next/link";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { ProjectList } from "@/components/projects/ProjectList";
import { listOwnProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Projects",
};

type ProjectsPageProps = {
  searchParams: Promise<{ show?: string }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const includeArchived = params.show === "archived" || params.show === "all";
  const showArchivedOnly = params.show === "archived";

  const supabase = await createClient();
  const { projects, error } = await listOwnProjects(supabase, {
    includeArchived: true,
  });

  const visibleProjects = showArchivedOnly
    ? projects.filter((project) => project.status === "archived")
    : includeArchived
      ? projects
      : projects.filter((project) => project.status === "active");

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Projects
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Your projects
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Each project holds source material and generated outputs for one
            body of knowledge.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          New project
        </Link>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink href="/projects" active={!params.show}>
          Active
        </FilterLink>
        <FilterLink
          href="/projects?show=archived"
          active={params.show === "archived"}
        >
          Archived
        </FilterLink>
        <FilterLink href="/projects?show=all" active={params.show === "all"}>
          All
        </FilterLink>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <ProjectList
        projects={visibleProjects}
        emptyTitle={
          showArchivedOnly ? "No archived projects" : "No active projects"
        }
        emptyDescription={
          showArchivedOnly
            ? "Archived projects will appear here."
            : "Create a project to start uploading books, PDFs, or long-form video."
        }
      />
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg bg-[var(--accent)] px-3 py-1.5 font-semibold text-white"
          : "rounded-lg bg-white/70 px-3 py-1.5 font-medium text-muted ring-1 ring-[var(--border)] hover:bg-white"
      }
    >
      {children}
    </Link>
  );
}
