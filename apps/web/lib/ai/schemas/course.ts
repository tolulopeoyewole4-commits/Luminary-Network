import { z } from "zod";

export const sourceReferenceSchema = z.object({
  sectionId: z.string().min(1),
  sectionTitle: z.string().min(1),
  sectionNumber: z.number().int().positive(),
  pageStart: z.number().int().positive().nullable(),
  pageEnd: z.number().int().positive().nullable(),
});

export const courseLessonOutlineSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  learningObjectives: z.array(z.string().min(1)).min(1).max(8),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
});

export const courseModuleOutlineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  lessons: z.array(courseLessonOutlineSchema).min(1).max(12),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
});

export const courseOutlineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  targetAudience: z.string().min(1).max(500),
  learningOutcomes: z.array(z.string().min(1)).min(1).max(12),
  modules: z.array(courseModuleOutlineSchema).min(1).max(20),
  quizSuggestions: z.array(z.string().min(1)).min(1).max(20),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  groundingNotes: z.array(z.string().min(1)).default([]),
});

export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type CourseLessonOutline = z.infer<typeof courseLessonOutlineSchema>;
export type CourseModuleOutline = z.infer<typeof courseModuleOutlineSchema>;
export type CourseOutline = z.infer<typeof courseOutlineSchema>;

export type CourseGenerationSection = {
  id: string;
  sectionTitle: string;
  sectionNumber: number;
  pageStart: number | null;
  pageEnd: number | null;
  extractedText: string;
};

export type CourseGenerationInput = {
  targetAudience: string;
  courseObjective: string;
  durationLabel: string;
  moduleCount: number;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  sections: CourseGenerationSection[];
};
