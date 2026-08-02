import type {
  CourseGenerationInput,
  CourseOutline,
} from "@/lib/ai/schemas/course";
import type {
  GeneratedSocialContent,
  SocialGenerationInput,
} from "@/lib/ai/schemas/social";
import type {
  VideoStoryboard,
  VideoStoryboardInput,
} from "@/lib/ai/schemas/video";

export interface AIProvider {
  generateCourseOutline(input: CourseGenerationInput): Promise<CourseOutline>;
  generateSocialContent(
    input: SocialGenerationInput,
  ): Promise<GeneratedSocialContent[]>;
  generateVideoStoryboard(
    input: VideoStoryboardInput,
  ): Promise<VideoStoryboard>;
}
