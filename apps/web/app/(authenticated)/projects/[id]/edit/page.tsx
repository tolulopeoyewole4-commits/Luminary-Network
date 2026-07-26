import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { updateProjectAction } from "@/lib/projects/actions";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { project } = await getOwnProject(supabase, id);
  return {
    title: project ? `Edit ${project.name}` : "Edit project",
  };
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { project, error } = await getOwnProject(supabase, id);

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!project) {
    notFound();
  }

  const boundUpdate = updateProjectAction.bind(null, project.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Edit project
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <p className="mt-2 text-muted">
          Update the name, description, or type. Ownership stays with your
          account.
        </p>
      </section>

      <ProjectForm
        action={boundUpdate}
        submitLabel="Save changes"
        cancelHref={`/projects/${project.id}`}
        initialValues={{
          name: project.name,
          description: project.description ?? "",
          projectType: project.project_type,
        }}
      />
    </div>
  );
}
