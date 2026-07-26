"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOwnProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_MIME_TYPES,
  SIGNED_URL_EXPIRY_SECONDS,
  SOURCE_STORAGE_BUCKET,
} from "@/lib/uploads/constants";
import { getMaxFilesPerProject } from "@/lib/uploads/limits";
import { countProjectSourceFiles, getOwnSourceFile } from "@/lib/uploads/queries";
import {
  buildInternalStoragePath,
  validateSourceUpload,
} from "@/lib/uploads/validation";

export type PrepareUploadResult =
  | {
      ok: true;
      sourceFileId: string;
      storagePath: string;
      bucket: string;
      mimeType: string;
    }
  | {
      ok: false;
      error: string;
    };

export type SimpleActionResult =
  | { ok: true; message?: string; signedUrl?: string }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function prepareSourceUploadAction(input: {
  projectId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
}): Promise<PrepareUploadResult> {
  const { supabase, user } = await requireUser();

  const { project, error: projectError } = await getOwnProject(
    supabase,
    input.projectId,
  );

  if (projectError) {
    return { ok: false, error: projectError };
  }

  if (!project) {
    return { ok: false, error: "Project not found or you do not have access." };
  }

  if (project.status === "archived") {
    return {
      ok: false,
      error: "Restore this project before uploading files.",
    };
  }

  const validation = validateSourceUpload({
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const fileCount = await countProjectSourceFiles(supabase, project.id);
  const maxFiles = getMaxFilesPerProject();
  if (fileCount >= maxFiles) {
    return {
      ok: false,
      error: `This project already has ${maxFiles} files. Delete one to upload another.`,
    };
  }

  const objectId = randomUUID();
  let storagePath: string;
  try {
    storagePath = buildInternalStoragePath({
      userId: user.id,
      projectId: project.id,
      objectId,
      extension: validation.extension,
    });
  } catch {
    return { ok: false, error: "Unable to prepare a safe storage path." };
  }

  // Prefer the validated canonical MIME when the browser sent a generic type.
  const mimeType =
    input.mimeType && input.mimeType !== "application/octet-stream"
      ? input.mimeType.toLowerCase()
      : ALLOWED_MIME_TYPES[validation.fileType][0];

  const { data, error } = await supabase
    .from("source_files")
    .insert({
      user_id: user.id,
      project_id: project.id,
      original_filename: validation.safeOriginalFilename,
      internal_storage_path: storagePath,
      file_type: validation.fileType,
      mime_type: mimeType,
      file_size: input.fileSize,
      processing_status: "uploading",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to prepare source upload", error?.message);
    return {
      ok: false,
      error: "Unable to prepare the upload. Please try again.",
    };
  }

  return {
    ok: true,
    sourceFileId: data.id,
    storagePath,
    bucket: SOURCE_STORAGE_BUCKET,
    mimeType,
  };
}

export async function completeSourceUploadAction(
  sourceFileId: string,
): Promise<SimpleActionResult> {
  const { supabase } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) {
    return { ok: false, error: "File record not found or inaccessible." };
  }

  if (file.processing_status !== "uploading") {
    return { ok: true, message: "Upload already finalized." };
  }

  // Confirm the private object exists before marking uploaded.
  const { data: listed, error: listError } = await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .list(file.internal_storage_path.split("/").slice(0, -1).join("/"), {
      search: file.internal_storage_path.split("/").pop(),
      limit: 1,
    });

  if (listError) {
    console.error("Failed to verify uploaded object", listError.message);
    await supabase
      .from("source_files")
      .update({
        processing_status: "failed",
        error_message: "Upload verification failed.",
      })
      .eq("id", sourceFileId);

    return {
      ok: false,
      error: "Upload could not be verified. Please try again.",
    };
  }

  const objectName = file.internal_storage_path.split("/").pop();
  const found = (listed ?? []).some((item) => item.name === objectName);
  if (!found) {
    await supabase
      .from("source_files")
      .update({
        processing_status: "failed",
        error_message: "Storage object missing after upload.",
      })
      .eq("id", sourceFileId);

    return {
      ok: false,
      error: "File did not arrive in private storage. Please retry the upload.",
    };
  }

  const { error: updateError } = await supabase
    .from("source_files")
    .update({
      processing_status: "uploaded",
      error_message: null,
    })
    .eq("id", sourceFileId);

  if (updateError) {
    console.error("Failed to finalize upload", updateError.message);
    return { ok: false, error: "Unable to finalize the upload." };
  }

  revalidatePath(`/projects/${file.project_id}`);
  return { ok: true, message: "Upload complete." };
}

export async function failSourceUploadAction(
  sourceFileId: string,
  reason: string,
): Promise<SimpleActionResult> {
  const { supabase } = await requireUser();
  const { file } = await getOwnSourceFile(supabase, sourceFileId);
  if (!file) {
    return { ok: false, error: "File record not found or inaccessible." };
  }

  await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .remove([file.internal_storage_path]);

  await supabase
    .from("source_files")
    .update({
      processing_status: "failed",
      error_message: reason.slice(0, 500),
    })
    .eq("id", sourceFileId);

  revalidatePath(`/projects/${file.project_id}`);
  return { ok: true };
}

export async function createSourceFileSignedUrlAction(
  sourceFileId: string,
): Promise<SimpleActionResult> {
  const { supabase } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) {
    return { ok: false, error: "File not found or inaccessible." };
  }

  if (file.processing_status === "uploading") {
    return { ok: false, error: "This file is still uploading." };
  }

  const { data, error: signError } = await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .createSignedUrl(file.internal_storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !data?.signedUrl) {
    console.error("Failed to sign URL", signError?.message);
    return { ok: false, error: "Unable to create a secure download link." };
  }

  return { ok: true, signedUrl: data.signedUrl };
}

export async function deleteSourceFileAction(
  sourceFileId: string,
): Promise<SimpleActionResult> {
  const { supabase } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) {
    return { ok: false, error: "File not found or inaccessible." };
  }

  const { error: storageError } = await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .remove([file.internal_storage_path]);

  if (storageError) {
    console.error("Failed to delete storage object", storageError.message);
    // Continue to delete metadata so the UI is not stuck on orphaned rows.
  }

  const { error: deleteError } = await supabase
    .from("source_files")
    .delete()
    .eq("id", sourceFileId);

  if (deleteError) {
    console.error("Failed to delete source file row", deleteError.message);
    return { ok: false, error: "Unable to delete this file." };
  }

  revalidatePath(`/projects/${file.project_id}`);
  return { ok: true, message: "File deleted." };
}
