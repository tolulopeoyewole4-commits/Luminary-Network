export const PROJECT_TYPES = [
  "video",
  "document",
  "course",
  "mixed",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_STATUSES = ["active", "archived"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  video: "Video",
  document: "Document",
  course: "Course",
  mixed: "Mixed",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const MAX_PROJECT_NAME_LENGTH = 120;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 2000;
