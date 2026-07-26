"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAIProvider } from "@/lib/ai/provider";
import type {
  SocialLength,
  SocialPlatform,
  SocialTone,
} from "@/lib/ai/schemas/social";
import {
  hasSocialGeneratorErrors,
  validateSocialGeneratorInput,
  type SocialGeneratorFieldErrors,
} from "@/lib/content/validation";
import { createClient } from "@/lib/supabase/server";

export type GenerateSocialState = {
  ok: boolean;
  message?: string;
  fieldErrors?: SocialGeneratorFieldErrors;
  createdIds?: string[];
};

export type SaveContentState = {
  ok: boolean;
  message?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function isRedirectError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT"),
  );
}

export async function generateSocialContentAction(
  projectId: string,
  _prev: GenerateSocialState,
  formData: FormData,
): Promise<GenerateSocialState> {
  const sourceFileId = String(formData.get("sourceFileId") ?? "");
  const sectionIds = formData.getAll("sectionIds").map(String).filter(Boolean);
  const platform = String(formData.get("platform") ?? "");
  const tone = String(formData.get("tone") ?? "");
  const length = String(formData.get("length") ?? "");
  const targetAudience = String(formData.get("targetAudience") ?? "");
  const callToAction = String(formData.get("callToAction") ?? "");
  const outputCount = Number(formData.get("outputCount") ?? "1");

  const fieldErrors = validateSocialGeneratorInput({
    sourceFileId,
    sectionIds,
    platform,
    tone,
    length,
    targetAudience,
    callToAction,
    outputCount,
  });

  if (hasSocialGeneratorErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, message: "Project not found or inaccessible." };
  }

  const { data: sourceFile } = await supabase
    .from("source_files")
    .select("id, project_id, processing_status")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (
    !sourceFile ||
    sourceFile.project_id !== projectId ||
    sourceFile.processing_status !== "ready"
  ) {
    return {
      ok: false,
      message: "Select a processed document from this project.",
    };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("document_sections")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .in("id", sectionIds)
    .order("section_number", { ascending: true });

  if (sectionsError || !sections || sections.length === 0) {
    return {
      ok: false,
      message: "Unable to load the selected source sections.",
    };
  }

  try {
    const provider = getAIProvider();
    const outputs = await provider.generateSocialContent({
      platform: platform as SocialPlatform,
      tone: tone as SocialTone,
      length: length as SocialLength,
      targetAudience: targetAudience.trim(),
      callToAction: callToAction.trim(),
      outputCount,
      sections: sections.map((section) => ({
        id: section.id,
        sectionTitle: section.section_title,
        sectionNumber: section.section_number,
        pageStart: section.page_start,
        pageEnd: section.page_end,
        extractedText: section.extracted_text,
      })),
    });

    const rows = outputs.map((output) => ({
      user_id: user.id,
      project_id: projectId,
      source_file_id: sourceFileId,
      content_type: output.contentType,
      title: output.title,
      body: output.body,
      tone,
      length_label: length,
      target_audience: targetAudience.trim(),
      call_to_action: callToAction.trim(),
      platform,
      generation_status: "draft" as const,
      source_references: output.sourceReferences,
    }));

    const { data: created, error } = await supabase
      .from("generated_content")
      .insert(rows)
      .select("id");

    if (error || !created?.length) {
      console.error("Failed to save generated content", error?.message);
      return { ok: false, message: "Unable to save generated content." };
    }

    revalidatePath(`/projects/${projectId}`);

    if (created.length === 1) {
      redirect(`/projects/${projectId}/content/${created[0].id}`);
    }

    redirect(`/projects/${projectId}?tab=content`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Social content generation failed", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Content generation failed. Please try again.",
    };
  }
}

export async function updateGeneratedContentAction(
  contentId: string,
  projectId: string,
  _prev: SaveContentState,
  formData: FormData,
): Promise<SaveContentState> {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const lengthLabel = String(formData.get("lengthLabel") ?? "").trim();
  const targetAudience = String(formData.get("targetAudience") ?? "").trim();
  const callToAction = String(formData.get("callToAction") ?? "").trim();
  const generationStatus = String(formData.get("generationStatus") ?? "draft") as
    | "draft"
    | "ready"
    | "archived";

  if (!title) return { ok: false, message: "Title is required." };
  if (!body) return { ok: false, message: "Body is required." };

  const { data, error } = await supabase
    .from("generated_content")
    .update({
      title,
      body,
      tone: tone || null,
      length_label: lengthLabel || null,
      target_audience: targetAudience || null,
      call_to_action: callToAction || null,
      generation_status: generationStatus,
    })
    .eq("id", contentId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Unable to save content changes." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/content/${contentId}`);
  return { ok: true, message: "Content saved." };
}

export async function duplicateGeneratedContentAction(
  contentId: string,
  projectId: string,
): Promise<SaveContentState> {
  const { supabase, user } = await requireUser();

  const { data: original, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .maybeSingle();

  if (error || !original || original.project_id !== projectId) {
    return { ok: false, message: "Content not found or inaccessible." };
  }

  const { data: copy, error: insertError } = await supabase
    .from("generated_content")
    .insert({
      user_id: user.id,
      project_id: original.project_id,
      source_file_id: original.source_file_id,
      content_type: original.content_type,
      title: `${original.title} (Copy)`,
      body: original.body,
      tone: original.tone,
      length_label: original.length_label,
      target_audience: original.target_audience,
      call_to_action: original.call_to_action,
      platform: original.platform,
      generation_status: "draft",
      source_references: original.source_references,
      duplicated_from_id: original.id,
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    console.error("Failed to duplicate content", insertError?.message);
    return { ok: false, message: "Unable to duplicate this content." };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/content/${copy.id}`);
}

export async function deleteGeneratedContentAction(
  contentId: string,
  projectId: string,
): Promise<SaveContentState> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("generated_content")
    .delete()
    .eq("id", contentId);

  if (error) {
    return { ok: false, message: "Unable to delete this content." };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
