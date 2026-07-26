import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseGeneratorForm } from "@/components/courses/CourseGeneratorForm";
import { Alert } from "@/components/ui/Alert";
import { listReadyDocumentSectionsForProject } from "@/lib/courses/queries";
import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

type NewCoursePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Generate course",
};

export default async function NewCoursePage({ params }: NewCoursePageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { project, error } = await getOwnProject(supabase, projectId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!project) notFound();

  const { files, error: filesError } =
    await listReadyDocumentSectionsForProject(supabase, projectId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Course builder
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Generate course outline
        </h1>
        <p className="mt-2 text-muted">
          Select source sections and teaching goals. The mock AI provider structures
          an editable outline with source references — it will not invent unsupported
          claims.
        </p>
      </section>

      {filesError ? <Alert tone="error">{filesError}</Alert> : null}
      <CourseGeneratorForm projectId={projectId} files={files} />
    </div>
  );
}
