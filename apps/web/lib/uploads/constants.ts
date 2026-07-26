export const SOURCE_STORAGE_BUCKET = "source-files";

export const SOURCE_FILE_TYPES = ["pdf", "docx", "txt", "mp4", "mov"] as const;
export type SourceFileType = (typeof SOURCE_FILE_TYPES)[number];

export const SOURCE_PROCESSING_STATUSES = [
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
] as const;
export type SourceProcessingStatus = (typeof SOURCE_PROCESSING_STATUSES)[number];

export const SOURCE_FILE_TYPE_LABELS: Record<SourceFileType, string> = {
  pdf: "PDF",
  docx: "Word document",
  txt: "Text",
  mp4: "MP4 video",
  mov: "MOV video",
};

export const ALLOWED_EXTENSIONS: Record<SourceFileType, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  mp4: "mp4",
  mov: "mov",
};

/** Canonical MIME types accepted by the app and storage bucket. */
export const ALLOWED_MIME_TYPES: Record<SourceFileType, readonly string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  txt: ["text/plain"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime"],
};

export const DOCUMENT_FILE_TYPES: SourceFileType[] = ["pdf", "docx", "txt"];
export const VIDEO_FILE_TYPES: SourceFileType[] = ["mp4", "mov"];

export const DEFAULT_MAX_DOCUMENT_UPLOAD_MB = 50;
export const DEFAULT_MAX_VIDEO_UPLOAD_MB = 500;
export const DEFAULT_MAX_FILES_PER_PROJECT = 25;

/** Signed URL lifetime for private downloads (seconds). */
export const SIGNED_URL_EXPIRY_SECONDS = 120;

export const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "jar",
  "sh",
  "ps1",
  "php",
  "dll",
  "dmg",
  "apk",
  "html",
  "htm",
] as const;
