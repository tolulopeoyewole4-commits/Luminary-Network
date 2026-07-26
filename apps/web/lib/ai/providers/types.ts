import type {
  CourseGenerationInput,
  CourseOutline,
} from "@/lib/ai/schemas/course";

export interface AIProvider {
  generateCourseOutline(input: CourseGenerationInput): Promise<CourseOutline>;
}
