import type { Metadata } from "next";

import { ProjectForm } from "@/components/projects/ProjectForm";
import { createProjectAction } from "@/lib/projects/actions";

export const metadata: Metadata = {
  title: "New project",
};

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          New project
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Create a project
        </h1>
        <p className="mt-2 text-muted">
          Give your knowledge workspace a clear name and type. You can upload
          source files in the next milestone.
        </p>
      </section>

      <ProjectForm
        action={createProjectAction}
        submitLabel="Create project"
        cancelHref="/projects"
      />
    </div>
  );
}
