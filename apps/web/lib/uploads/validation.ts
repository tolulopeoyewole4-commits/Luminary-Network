import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  BLOCKED_EXTENSIONS,
  SOURCE_FILE_TYPES,
  type SourceFileType,
} from "@/lib/uploads/constants";
import { formatBytes, getMaxBytesForFileType } from "@/lib/uploads/limits";

export type SourceUploadInput = {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

export type SourceUploadValidationResult =
  | {
      ok: true;
      fileType: SourceFileType;
      extension: string;
      safeOriginalFilename: string;
    }
  | {
      ok: false;
      error: string;
    };

function getExtension(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return "";
  return trimmed.slice(lastDot + 1).toLowerCase();
}

function sanitizeOriginalFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
  return cleaned || "upload";
}

export function resolveFileTypeFromExtension(
  extension: string,
): SourceFileType | null {
  const match = SOURCE_FILE_TYPES.find(
    (type) => ALLOWED_EXTENSIONS[type] === extension,
  );
  return match ?? null;
}

export function validateSourceUpload(
  input: SourceUploadInput,
): SourceUploadValidationResult {
  const safeOriginalFilename = sanitizeOriginalFilename(input.originalFilename);
  const extension = getExtension(safeOriginalFilename);

  if (!extension) {
    return { ok: false, error: "File must include a valid extension." };
  }

  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      ok: false,
      error: "Executable and script uploads are not allowed.",
    };
  }

  const fileType = resolveFileTypeFromExtension(extension);
  if (!fileType) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed: PDF, DOCX, TXT, MP4, MOV.",
    };
  }

  const allowedMimes = ALLOWED_MIME_TYPES[fileType];
  const mimeType = input.mimeType.trim().toLowerCase();

  // Browsers sometimes omit or mislabel MIME; require match when provided.
  if (mimeType && mimeType !== "application/octet-stream") {
    if (!allowedMimes.includes(mimeType)) {
      return {
        ok: false,
        error: `MIME type does not match a supported ${fileType.toUpperCase()} file.`,
      };
    }
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { ok: false, error: "File size is invalid." };
  }

  const maxBytes = getMaxBytesForFileType(fileType);
  if (input.fileSize > maxBytes) {
    return {
      ok: false,
      error: `File is too large. Maximum for ${fileType.toUpperCase()} is ${formatBytes(maxBytes)}.`,
    };
  }

  return {
    ok: true,
    fileType,
    extension,
    safeOriginalFilename,
  };
}

export function buildInternalStoragePath(input: {
  userId: string;
  projectId: string;
  objectId: string;
  extension: string;
}): string {
  // Never trust client paths. Always construct server-side.
  const userId = input.userId.replace(/[^a-zA-Z0-9-]/g, "");
  const projectId = input.projectId.replace(/[^a-zA-Z0-9-]/g, "");
  const objectId = input.objectId.replace(/[^a-zA-Z0-9-]/g, "");
  const extension = input.extension.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!userId || !projectId || !objectId || !extension) {
    throw new Error("Unable to build a safe storage path.");
  }

  return `${userId}/${projectId}/${objectId}.${extension}`;
}
