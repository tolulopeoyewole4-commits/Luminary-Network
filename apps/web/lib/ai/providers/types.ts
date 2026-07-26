import type {
  CourseGenerationInput,
  CourseOutline,
} from "@/lib/ai/schemas/course";
import type {
  GeneratedSocialContent,
  SocialGenerationInput,
} from "@/lib/ai/schemas/social";

export interface AIProvider {
  generateCourseOutline(input: CourseGenerationInput): Promise<CourseOutline>;
  generateSocialContent(
    input: SocialGenerationInput,
  ): Promise<GeneratedSocialContent[]>;
}
