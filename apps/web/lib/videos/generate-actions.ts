"use server";

import { randomUUID } from "node:crypto";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAIProvider } from "@/lib/ai/provider";
import type { VideoStoryboardMode } from "@/lib/ai/schemas/video";
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import {
  isAsyncVideoGenerateEnabled,
  isDedicatedJobWorkerEnabled,
} from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";
import {
  SIGNED_URL_EXPIRY_SECONDS,
  SOURCE_STORAGE_BUCKET,
} from "@/lib/uploads/constants";
import {
  hasVideoGenerateErrors,
  validateVideoGenerateInput,
  type VideoGenerateFieldErrors,
  type VideoGenerateInput,
} from "@/lib/videos/validation";
import type { GeneratedVideoStoryboardScene } from "@/types/database";

export type GenerateVideoState = {
  ok: boolean;
  message?: string;
  fieldErrors?: VideoGenerateFieldErrors;
  queued?: boolean;
  jobId?: string;
  generatedVideoId?: string;
  signedUrl?: string;
};

export type GeneratedVideoActionResult =
  | { ok: true; message: string; signedUrl?: string; generatedVideoId?: string }
  | { ok: false; error: string };

type VideoJobPayload = VideoGenerateInput;

type EnqueuedVideoGenerate = {
  projectId: string;
  jobId: string;
  generatedVideoId: string;
  userId: string;
  title: string;
  storagePath: string;
  scenes: GeneratedVideoStoryboardScene[];
};

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

function getInternalApiToken(): string {
  return process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";
}

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

function revalidateVideoPaths(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/videos`);
}

function parseVideoPayload(raw: unknown): VideoJobPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.title !== "string" ||
    typeof value.sourceText !== "string" ||
    (value.mode !== "TEXT_TO_VIDEO" && value.mode !== "SCRIPT_TO_FILM")
  ) {
    return null;
  }
  return {
    title: value.title,
    sourceText: value.sourceText,
    mode: value.mode as VideoStoryboardMode,
  };
}

async function enqueueVideoGenerate(input: {
  projectId: string;
  form: VideoGenerateInput;
  existingJobId?: string;
}): Promise<
  | { ok: true; work: EnqueuedVideoGenerate }
  | { ok: false; message: string; fieldErrors?: VideoGenerateFieldErrors }
> {
  const fieldErrors = validateVideoGenerateInput(input.form);
  if (hasVideoGenerateErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", input.projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, message: "Project not found or inaccessible." };
  }
  if (project.status === "archived") {
    return { ok: false, message: "Restore this project before generating videos." };
  }

  const title = input.form.title.trim();
  const sourceText = input.form.sourceText.trim();
  const mode = input.form.mode;

  // Build the storyboard now (deterministic mock) so both the Next.js path and
  // the dedicated worker render from the same scenes.
  let scenes: GeneratedVideoStoryboardScene[];
  try {
    const provider = getAIProvider();
    const storyboard = await provider.generateVideoStoryboard({
      title,
      mode,
      sourceText,
    });
    scenes = storyboard.scenes.map((scene) => ({
      caption: scene.caption,
      duration_seconds: scene.durationSeconds,
    }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build a storyboard.";
    return { ok: false, message };
  }

  const payload: VideoJobPayload = { title, mode, sourceText };
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
        // Start non-claimable; flipped to "queued" once the artifact row exists
        // so the dedicated worker never claims a job before generated_videos is written.
        status: "processing",
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
        job_type: "video_generate",
        // Created non-claimable; flipped to "queued" after the artifact row exists.
        status: "processing",
        progress_percentage: 0,
        payload,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create video generate job", jobError?.message);
      return { ok: false, message: "Unable to start video generation." };
    }
    jobId = job.id;
  }

  const objectId = randomUUID();
  const storagePath = `${user.id}/${input.projectId}/generated/${objectId}.mp4`;

  const { data: existingGenerated } = await supabase
    .from("generated_videos")
    .select("id")
    .eq("processing_job_id", jobId)
    .maybeSingle();

  let generatedVideoId = existingGenerated?.id;

  if (generatedVideoId) {
    await supabase
      .from("generated_videos")
      .update({
        title,
        mode,
        source_text: sourceText,
        storyboard: scenes,
        status: "processing",
        error_message: null,
        internal_storage_path: storagePath,
        duration_seconds: null,
        file_size: null,
      })
      .eq("id", generatedVideoId);
  } else {
    const { data: created, error: createError } = await supabase
      .from("generated_videos")
      .insert({
        user_id: user.id,
        project_id: input.projectId,
        processing_job_id: jobId,
        title,
        mode,
        source_text: sourceText,
        storyboard: scenes,
        mime_type: "video/mp4",
        internal_storage_path: storagePath,
        status: "processing",
      })
      .select("id")
      .single();

    if (createError || !created) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "failed",
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          error_message: "Unable to create generated video record.",
        })
        .eq("id", jobId);
      return { ok: false, message: "Unable to create generated video record." };
    }
    generatedVideoId = created.id;
  }

  // Now that the generated_videos artifact row exists, make the job claimable.
  // This closes a race where the dedicated worker could claim the job before
  // the artifact was written ("Unable to find generated video linked to this job").
  await supabase
    .from("processing_jobs")
    .update({ status: "queued", progress_percentage: 0 })
    .eq("id", jobId);

  revalidateVideoPaths(input.projectId);

  return {
    ok: true,
    work: {
      projectId: input.projectId,
      jobId,
      generatedVideoId,
      userId: user.id,
      title,
      storagePath,
      scenes,
    },
  };
}

async function executeVideoGenerate(
  work: EnqueuedVideoGenerate,
): Promise<GenerateVideoState> {
  const supabase = await createClient();
  const { projectId, jobId, generatedVideoId, title, storagePath, scenes } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 15);
  if (!started) {
    return { ok: false, message: "This job was cancelled." };
  }

  try {
    await bumpProcessingJobProgressIfActive(supabase, jobId, 35);

    const response = await fetch(`${getApiBaseUrl()}/api/v1/videos/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": getInternalApiToken(),
      },
      body: JSON.stringify({ title, scenes }),
    });

    if (!response.ok) {
      let detail = "Video generation failed.";
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errorPayload = (await response.json()) as { detail?: string };
        if (typeof errorPayload.detail === "string") detail = errorPayload.detail;
      }
      throw new Error(detail);
    }

    const videoBytes = await response.arrayBuffer();
    if (!videoBytes.byteLength) {
      throw new Error("Generated video was empty.");
    }

    const durationHeader = Number(response.headers.get("x-video-duration"));
    const durationSeconds = Number.isFinite(durationHeader)
      ? durationHeader
      : scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

    await bumpProcessingJobProgressIfActive(supabase, jobId, 75);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, message: "This job was cancelled." };
    }

    const { error: uploadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .upload(storagePath, videoBytes, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Unable to store generated video.");
    }

    const { error: updateError } = await supabase
      .from("generated_videos")
      .update({
        status: "ready",
        file_size: videoBytes.byteLength,
        mime_type: "video/mp4",
        duration_seconds: Number(durationSeconds.toFixed(3)),
        internal_storage_path: storagePath,
        error_message: null,
      })
      .eq("id", generatedVideoId);

    if (updateError) {
      throw new Error("Unable to finalize generated video metadata.");
    }

    const completed = await completeProcessingJobIfActive(supabase, jobId);
    if (!completed) {
      await supabase
        .from("generated_videos")
        .update({
          status: "failed",
          error_message: "Generation cancelled by user.",
        })
        .eq("id", generatedVideoId);
      return { ok: false, message: "This job was cancelled." };
    }

    const { data: signed } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    revalidateVideoPaths(projectId);

    return {
      ok: true,
      jobId,
      generatedVideoId,
      signedUrl: signed?.signedUrl,
      message: `Generated “${title}” (${durationSeconds.toFixed(1)}s).`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Video generation failed.";

    const failed = await failProcessingJobIfActive(supabase, jobId, message);
    if (failed) {
      await supabase
        .from("generated_videos")
        .update({
          status: "failed",
          error_message: message.slice(0, 500),
        })
        .eq("id", generatedVideoId);
    }

    revalidateVideoPaths(projectId);
    return { ok: false, message };
  }
}

export async function generateVideoAction(
  projectId: string,
  _prev: GenerateVideoState,
  formData: FormData,
): Promise<GenerateVideoState> {
  const form: VideoGenerateInput = {
    title: String(formData.get("title") ?? ""),
    mode: String(formData.get("mode") ?? "TEXT_TO_VIDEO") as VideoStoryboardMode,
    sourceText: String(formData.get("sourceText") ?? ""),
  };

  const queued = await enqueueVideoGenerate({ projectId, form });
  if (!queued.ok) {
    return {
      ok: false,
      message: queued.message,
      fieldErrors: queued.fieldErrors,
    };
  }

  if (isDedicatedJobWorkerEnabled()) {
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      generatedVideoId: queued.work.generatedVideoId,
      message:
        "Video generation queued for the dedicated worker. Watch the jobs list; play it from the videos tab when ready.",
    };
  }

  if (isAsyncVideoGenerateEnabled()) {
    after(() => {
      void executeVideoGenerate(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      generatedVideoId: queued.work.generatedVideoId,
      message:
        "Video generation queued. Watch the jobs list; play it from the videos tab when ready.",
    };
  }

  return executeVideoGenerate(queued.work);
}

export async function retryVideoGenerateAction(
  jobId: string,
): Promise<{ ok: true; message: string; jobId: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id || job.job_type !== "video_generate") {
    return { ok: false, error: "Video generation job not found or inaccessible." };
  }

  const payload = parseVideoPayload(job.payload);
  if (!payload) {
    return { ok: false, error: "This job is missing generation inputs to retry." };
  }

  const queued = await enqueueVideoGenerate({
    projectId: job.project_id,
    form: payload,
    existingJobId: job.id,
  });

  if (!queued.ok) {
    return { ok: false, error: queued.message };
  }

  if (isDedicatedJobWorkerEnabled()) {
    return {
      ok: true,
      jobId: queued.work.jobId,
      message: "Video generation re-queued for the dedicated worker.",
    };
  }

  if (isAsyncVideoGenerateEnabled()) {
    after(() => {
      void executeVideoGenerate(queued.work);
    });
    return {
      ok: true,
      jobId: queued.work.jobId,
      message: "Video generation re-queued.",
    };
  }

  const result = await executeVideoGenerate(queued.work);
  if (!result.ok) {
    return { ok: false, error: result.message || "Video generation failed." };
  }
  return {
    ok: true,
    jobId: result.jobId ?? queued.work.jobId,
    message: result.message || "Video generated.",
  };
}

export async function createGeneratedVideoSignedUrlAction(
  generatedVideoId: string,
): Promise<GeneratedVideoActionResult> {
  const { supabase } = await requireUser();
  const { data: video, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("id", generatedVideoId)
    .maybeSingle();

  if (error || !video) {
    return { ok: false, error: "Generated video not found or inaccessible." };
  }
  if (video.status !== "ready") {
    return { ok: false, error: "This video is not ready yet." };
  }

  const { data, error: signError } = await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .createSignedUrl(video.internal_storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !data?.signedUrl) {
    return { ok: false, error: "Unable to create a secure video link." };
  }

  return {
    ok: true,
    message: `Ready: “${video.title || "video"}”.`,
    signedUrl: data.signedUrl,
    generatedVideoId: video.id,
  };
}
