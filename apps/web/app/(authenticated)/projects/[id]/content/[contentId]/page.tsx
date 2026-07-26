import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentEditorForm } from "@/components/content/ContentEditorForm";
import { Alert } from "@/components/ui/Alert";
import { getOwnGeneratedContent } from "@/lib/content/queries";
import { createClient } from "@/lib/supabase/server";

type ContentPageProps = {
  params: Promise<{ id: string; contentId: string }>;
};

export async function generateMetadata({
  params,
}: ContentPageProps): Promise<Metadata> {
  const { contentId } = await params;
  const supabase = await createClient();
  const { item } = await getOwnGeneratedContent(supabase, contentId);
  return { title: item?.title ?? "Content" };
}

export default async function ContentDetailPage({ params }: ContentPageProps) {
  const { id: projectId, contentId } = await params;
  const supabase = await createClient();
  const { item, error } = await getOwnGeneratedContent(supabase, contentId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!item || item.project_id !== projectId) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
          Content library
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Review and edit
        </h1>
        <p className="mt-2 text-muted">
          Edit freely, duplicate variants, and keep source references attached.
        </p>
      </section>

      <ContentEditorForm item={item} />
    </div>
  );
}
