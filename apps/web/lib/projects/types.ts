import type { ProjectFieldErrors } from "@/lib/projects/validation";

export type ProjectActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: ProjectFieldErrors;
};
