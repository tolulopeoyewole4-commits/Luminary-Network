"use server";

import { after } from "next/server";
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
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import { isAsyncAiGenerationEnabled } from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";

export type GenerateSocialState = {
  ok: boolean;
  message?: string;
  fieldErrors?: SocialGeneratorFieldErrors;
  createdIds?: string[];
  queued?: boolean;
  jobId?: string;
};

export type SaveContentState = {
  ok: boolean;
  message?: string;
};

export type SocialGenerateInput = {
  sourceFileId: string;
  sectionIds: string[];
  platform: SocialPlatform;
  tone: SocialTone;
  length: SocialLength;
  targetAudience: string;
  callToAction: string;
  outputCount: number;
};

type SocialJobPayload = SocialGenerateInput & {
  resultContentIds?: string[];
};

type EnqueuedSocialGenerate = {
  projectId: string;
  jobId: string;
  userId: string;
  input: SocialGenerateInput;
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

function parseSocialPayload(raw: unknown): SocialJobPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.sourceFileId !== "string" ||
    !Array.isArray(value.sectionIds) ||
    typeof value.platform !== "string" ||
    typeof value.tone !== "string" ||
    typeof value.length !== "string" ||
    typeof value.targetAudience !== "string" ||
    typeof value.callToAction !== "string" ||
    typeof value.outputCount !== "number"
  ) {
    return null;
  }
  return {
    sourceFileId: value.sourceFileId,
    sectionIds: value.sectionIds.map(String).filter(Boolean),
    platform: value.platform as SocialPlatform,
    tone: value.tone as SocialTone,
    length: value.length as SocialLength,
    targetAudience: value.targetAudience,
    callToAction: value.callToAction,
    outputCount: value.outputCount,
    resultContentIds: Array.isArray(value.resultContentIds)
      ? value.resultContentIds.map(String)
      : undefined,
  };
}

async function enqueueSocialGenerate(input: {
  projectId: string;
  form: SocialGenerateInput;
  existingJobId?: string;
}): Promise<
  | { ok: true; work: EnqueuedSocialGenerate }
  | { ok: false; message: string; fieldErrors?: SocialGeneratorFieldErrors }
> {
  const fieldErrors = validateSocialGeneratorInput(input.form);
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
    .eq("id", input.projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, message: "Project not found or inaccessible." };
  }

  const { data: sourceFile } = await supabase
    .from("source_files")
    .select("id, project_id, processing_status")
    .eq("id", input.form.sourceFileId)
    .maybeSingle();

  if (
    !sourceFile ||
    sourceFile.project_id !== input.projectId ||
    sourceFile.processing_status !== "ready"
  ) {
    return {
      ok: false,
      message: "Select a processed document from this project.",
    };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("document_sections")
    .select("id")
    .eq("source_file_id", input.form.sourceFileId)
    .in("id", input.form.sectionIds);

  if (sectionsError || !sections || sections.length === 0) {
    return {
      ok: false,
      message: "Unable to load the selected source sections.",
    };
  }

  const payload: SocialJobPayload = { ...input.form };
  let jobId = input.existingJobId;

  if (jobId) {
    const { data: existing } = await supabase
      .from("processing_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!existing || existing.user_id !== user.id) {
      return { ok: false, message: "Processing job not found or inaccessible." };
    }
    await supabase
      .from("processing_jobs")
      .update({
        status: "queued",
        progress_percentage: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
        payload,
      })
      .eq("id", jobId);
  } else {
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        project_id: input.projectId,
        source_file_id: input.form.sourceFileId,
        job_type: "social_generate",
        status: "queued",
        progress_percentage: 0,
        payload,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create social job", jobError?.message);
      return { ok: false, message: "Unable to start content generation." };
    }
    jobId = job.id;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${input.projectId}`);

  return {
    ok: true,
    work: {
      projectId: input.projectId,
      jobId,
      userId: user.id,
      input: input.form,
    },
  };
}

async function executeSocialGenerate(
  work: EnqueuedSocialGenerate,
): Promise<GenerateSocialState> {
  const supabase = await createClient();
  const { projectId, jobId, userId, input } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 15);
  if (!started) {
    return { ok: false, message: "This job was cancelled." };
  }

  try {
    const { data: sections, error: sectionsError } = await supabase
      .from("document_sections")
      .select("*")
      .eq("source_file_id", input.sourceFileId)
      .in("id", input.sectionIds)
      .order("section_number", { ascending: true });

    if (sectionsError || !sections || sections.length === 0) {
      throw new Error("Unable to load the selected source sections.");
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 40);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, message: "This job was cancelled." };
    }

    const provider = getAIProvider();
    const outputs = await provider.generateSocialContent({
      platform: input.platform,
      tone: input.tone,
      length: input.length,
      targetAudience: input.targetAudience.trim(),
      callToAction: input.callToAction.trim(),
      outputCount: input.outputCount,
      sections: sections.map((section) => ({
        id: section.id,
        sectionTitle: section.section_title,
        sectionNumber: section.section_number,
        pageStart: section.page_start,
        pageEnd: section.page_end,
        extractedText: section.extracted_text,
      })),
    });

    await bumpProcessingJobProgressIfActive(supabase, jobId, 70);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, message: "This job was cancelled." };
    }

    const rows = outputs.map((output) => ({
      user_id: userId,
      project_id: projectId,
      source_file_id: input.sourceFileId,
      content_type: output.contentType,
      title: output.title,
      body: output.body,
      tone: input.tone,
      length_label: input.length,
      target_audience: input.targetAudience.trim(),
      call_to_action: input.callToAction.trim(),
      platform: input.platform,
      generation_status: "draft" as const,
      source_references: output.sourceReferences,
    }));

    const { data: created, error } = await supabase
      .from("generated_content")
      .insert(rows)
      .select("id");

    if (error || !created?.length) {
      console.error("Failed to save generated content", error?.message);
      throw new Error("Unable to save generated content.");
    }

    const createdIds = created.map((row) => row.id);
    const completedPayload: SocialJobPayload = {
      ...input,
      resultContentIds: createdIds,
    };

    const completed = await completeProcessingJobIfActive(supabase, jobId, {
      payload: completedPayload,
    });
    if (!completed) {
      return { ok: false, message: "This job was cancelled." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);

    return {
      ok: true,
      jobId,
      createdIds,
      message: `Generated ${createdIds.length} content item${createdIds.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error
        ? error.message
        : "Content generation failed. Please try again.";

    await failProcessingJobIfActive(supabase, jobId, message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: false, message };
  }
}

export async function generateSocialContentAction(
  projectId: string,
  _prev: GenerateSocialState,
  formData: FormData,
): Promise<GenerateSocialState> {
  const form: SocialGenerateInput = {
    sourceFileId: String(formData.get("sourceFileId") ?? ""),
    sectionIds: formData.getAll("sectionIds").map(String).filter(Boolean),
    platform: String(formData.get("platform") ?? "") as SocialPlatform,
    tone: String(formData.get("tone") ?? "") as SocialTone,
    length: String(formData.get("length") ?? "") as SocialLength,
    targetAudience: String(formData.get("targetAudience") ?? ""),
    callToAction: String(formData.get("callToAction") ?? ""),
    outputCount: Number(formData.get("outputCount") ?? "1"),
  };

  const queued = await enqueueSocialGenerate({ projectId, form });
  if (!queued.ok) {
    return {
      ok: false,
      message: queued.message,
      fieldErrors: queued.fieldErrors,
    };
  }

  if (isAsyncAiGenerationEnabled()) {
    after(() => {
      void executeSocialGenerate(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Content generation queued. Watch the jobs list; open new items from the project content library when ready.",
    };
  }

  const result = await executeSocialGenerate(queued.work);
  if (!result.ok || !result.createdIds?.length) {
    return result;
  }

  if (result.createdIds.length === 1) {
    redirect(`/projects/${projectId}/content/${result.createdIds[0]}`);
  }
  redirect(`/projects/${projectId}?tab=content`);
}

export async function retrySocialGenerateAction(
  jobId: string,
): Promise<{ ok: true; message: string; jobId: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id || job.job_type !== "social_generate") {
    return { ok: false, error: "Content generation job not found or inaccessible." };
  }

  const payload = parseSocialPayload(job.payload);
  if (!payload) {
    return { ok: false, error: "This job is missing generation inputs to retry." };
  }

  const queued = await enqueueSocialGenerate({
    projectId: job.project_id,
    form: {
      sourceFileId: payload.sourceFileId,
      sectionIds: payload.sectionIds,
      platform: payload.platform,
      tone: payload.tone,
      length: payload.length,
      targetAudience: payload.targetAudience,
      callToAction: payload.callToAction,
      outputCount: payload.outputCount,
    },
    existingJobId: job.id,
  });

  if (!queued.ok) {
    return { ok: false, error: queued.message };
  }

  if (isAsyncAiGenerationEnabled()) {
    after(() => {
      void executeSocialGenerate(queued.work);
    });
    return {
      ok: true,
      jobId: queued.work.jobId,
      message: "Content generation re-queued.",
    };
  }

  const result = await executeSocialGenerate(queued.work);
  if (!result.ok) {
    return { ok: false, error: result.message || "Content generation failed." };
  }
  return {
    ok: true,
    jobId: result.jobId ?? queued.work.jobId,
    message: result.message || "Content generated.",
  };
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
