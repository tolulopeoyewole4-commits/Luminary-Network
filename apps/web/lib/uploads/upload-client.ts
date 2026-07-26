import { getPublicSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { SOURCE_STORAGE_BUCKET } from "@/lib/uploads/constants";

type UploadWithProgressInput = {
  storagePath: string;
  file: File;
  mimeType: string;
  onProgress?: (percent: number) => void;
};

/**
 * Uploads a private object through the Supabase Storage REST API so we can
 * report byte-level progress. Paths are always supplied by the server.
 */
export async function uploadSourceFileWithProgress(
  input: UploadWithProgressInput,
): Promise<void> {
  const { url, anonKey } = getPublicSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to upload files.");
  }

  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${SOURCE_STORAGE_BUCKET}/${input.storagePath}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader(
      "Content-Type",
      input.mimeType || input.file.type || "application/octet-stream",
    );
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader(
      "cache-control",
      "private, max-age=0, no-store",
    );

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !input.onProgress) return;
      const percent = Math.min(
        100,
        Math.round((event.loaded / event.total) * 100),
      );
      input.onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress?.(100);
        resolve();
        return;
      }

      let message = "Upload failed.";
      try {
        const parsed = JSON.parse(xhr.responseText) as {
          message?: string;
          error?: string;
        };
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep default message.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(input.file);
  });
}
