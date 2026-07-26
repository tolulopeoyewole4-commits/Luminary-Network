export type CourseGeneratorFieldErrors = {
  sourceFileId?: string;
  sectionIds?: string;
  targetAudience?: string;
  courseObjective?: string;
  durationLabel?: string;
  moduleCount?: string;
  difficultyLevel?: string;
};

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export function validateCourseGeneratorInput(input: {
  sourceFileId: string;
  sectionIds: string[];
  targetAudience: string;
  courseObjective: string;
  durationLabel: string;
  moduleCount: number;
  difficultyLevel: string;
}): CourseGeneratorFieldErrors {
  const errors: CourseGeneratorFieldErrors = {};

  if (!input.sourceFileId.trim()) {
    errors.sourceFileId = "Select a source document.";
  }
  if (input.sectionIds.length === 0) {
    errors.sectionIds = "Select at least one chapter or section.";
  }
  if (!input.targetAudience.trim()) {
    errors.targetAudience = "Target audience is required.";
  }
  if (!input.courseObjective.trim()) {
    errors.courseObjective = "Course objective is required.";
  }
  if (!input.durationLabel.trim()) {
    errors.durationLabel = "Course duration is required.";
  }
  if (
    !Number.isFinite(input.moduleCount) ||
    input.moduleCount < 1 ||
    input.moduleCount > 12
  ) {
    errors.moduleCount = "Choose between 1 and 12 modules.";
  }
  if (
    !(DIFFICULTIES as readonly string[]).includes(input.difficultyLevel)
  ) {
    errors.difficultyLevel = "Select a valid difficulty level.";
  }

  return errors;
}

export function hasCourseGeneratorErrors(
  errors: CourseGeneratorFieldErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}
