import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseEditorForm } from "@/components/courses/CourseEditorForm";
import { Alert } from "@/components/ui/Alert";
import { getCourseWithStructure } from "@/lib/courses/queries";
import { createClient } from "@/lib/supabase/server";

type CoursePageProps = {
  params: Promise<{ id: string; courseId: string }>;
};

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const supabase = await createClient();
  const { course } = await getCourseWithStructure(supabase, courseId);
  return { title: course?.title ?? "Course" };
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { id: projectId, courseId } = await params;
  const supabase = await createClient();
  const { course, error } = await getCourseWithStructure(supabase, courseId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!course || course.project_id !== projectId) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Course outline
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Review and edit
        </h1>
        <p className="mt-2 text-muted">
          Every field is editable. Source references stay attached so teaching
          content remains grounded in your document.
        </p>
      </section>

      <CourseEditorForm course={course} />
    </div>
  );
}
