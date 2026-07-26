import {
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  PROJECT_TYPES,
  type ProjectType,
} from "@/lib/projects/constants";

export type ProjectFieldErrors = {
  name?: string;
  description?: string;
  projectType?: string;
};

export type ProjectFormInput = {
  name: string;
  description: string;
  projectType: string;
};

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

export function validateProjectForm(input: ProjectFormInput): ProjectFieldErrors {
  const errors: ProjectFieldErrors = {};
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name) {
    errors.name = "Project name is required.";
  } else if (name.length > MAX_PROJECT_NAME_LENGTH) {
    errors.name = `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`;
  }

  if (description.length > MAX_PROJECT_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  if (!isProjectType(input.projectType)) {
    errors.projectType = "Select a valid project type.";
  }

  return errors;
}

export function hasProjectFieldErrors(errors: ProjectFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function normalizeProjectForm(input: ProjectFormInput): {
  name: string;
  description: string | null;
  projectType: ProjectType;
} | null {
  const errors = validateProjectForm(input);
  if (hasProjectFieldErrors(errors) || !isProjectType(input.projectType)) {
    return null;
  }

  const description = input.description.trim();
  return {
    name: input.name.trim(),
    description: description.length > 0 ? description : null,
    projectType: input.projectType,
  };
}
