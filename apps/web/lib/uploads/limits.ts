import {
  DEFAULT_MAX_DOCUMENT_UPLOAD_MB,
  DEFAULT_MAX_FILES_PER_PROJECT,
  DEFAULT_MAX_VIDEO_UPLOAD_MB,
  DOCUMENT_FILE_TYPES,
  VIDEO_FILE_TYPES,
  type SourceFileType,
} from "@/lib/uploads/constants";

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function getMaxDocumentUploadMb(): number {
  return readPositiveInt(
    process.env.MAX_DOCUMENT_UPLOAD_MB ??
      process.env.NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_MB,
    DEFAULT_MAX_DOCUMENT_UPLOAD_MB,
  );
}

export function getMaxVideoUploadMb(): number {
  return readPositiveInt(
    process.env.MAX_VIDEO_UPLOAD_MB ??
      process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB,
    DEFAULT_MAX_VIDEO_UPLOAD_MB,
  );
}

export function getMaxFilesPerProject(): number {
  return readPositiveInt(
    process.env.MAX_FILES_PER_PROJECT ??
      process.env.NEXT_PUBLIC_MAX_FILES_PER_PROJECT,
    DEFAULT_MAX_FILES_PER_PROJECT,
  );
}

export function getMaxBytesForFileType(fileType: SourceFileType): number {
  if (DOCUMENT_FILE_TYPES.includes(fileType)) {
    return getMaxDocumentUploadMb() * 1024 * 1024;
  }
  if (VIDEO_FILE_TYPES.includes(fileType)) {
    return getMaxVideoUploadMb() * 1024 * 1024;
  }
  return getMaxDocumentUploadMb() * 1024 * 1024;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
