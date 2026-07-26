import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Course,
  CourseLesson,
  CourseModule,
  Database,
  DocumentSection,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export type CourseWithStructure = Course & {
  modules: Array<CourseModule & { lessons: CourseLesson[] }>;
};

export async function listProjectCourses(
  supabase: Client,
  projectId: string,
): Promise<{ courses: Course[]; error: string | null }> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list courses", error.message);
    return { courses: [], error: "Unable to load courses." };
  }

  return { courses: data ?? [], error: null };
}

export async function listReadyDocumentSectionsForProject(
  supabase: Client,
  projectId: string,
): Promise<{
  files: Array<{
    id: string;
    original_filename: string;
    sections: DocumentSection[];
  }>;
  error: string | null;
}> {
  const { data: files, error: filesError } = await supabase
    .from("source_files")
    .select("id, original_filename, processing_status, file_type")
    .eq("project_id", projectId)
    .eq("processing_status", "ready")
    .in("file_type", ["pdf", "docx", "txt"])
    .order("created_at", { ascending: false });

  if (filesError) {
    console.error("Failed to list ready documents", filesError.message);
    return { files: [], error: "Unable to load source documents." };
  }

  if (!files || files.length === 0) {
    return { files: [], error: null };
  }

  const fileIds = files.map((file) => file.id);
  const { data: sections, error: sectionsError } = await supabase
    .from("document_sections")
    .select("*")
    .in("source_file_id", fileIds)
    .order("section_number", { ascending: true });

  if (sectionsError) {
    console.error("Failed to list sections", sectionsError.message);
    return { files: [], error: "Unable to load document sections." };
  }

  return {
    files: files.map((file) => ({
      id: file.id,
      original_filename: file.original_filename,
      sections: (sections ?? []).filter(
        (section) => section.source_file_id === file.id,
      ),
    })),
    error: null,
  };
}

export async function getCourseWithStructure(
  supabase: Client,
  courseId: string,
): Promise<{ course: CourseWithStructure | null; error: string | null }> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load course", error.message);
    return { course: null, error: "Unable to load this course." };
  }

  if (!course) {
    return { course: null, error: null };
  }

  const { data: modules, error: modulesError } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (modulesError) {
    console.error("Failed to load modules", modulesError.message);
    return { course: null, error: "Unable to load course modules." };
  }

  const moduleIds = (modules ?? []).map((module) => module.id);
  let lessons: CourseLesson[] = [];

  if (moduleIds.length > 0) {
    const { data: lessonRows, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("*")
      .in("module_id", moduleIds)
      .order("position", { ascending: true });

    if (lessonsError) {
      console.error("Failed to load lessons", lessonsError.message);
      return { course: null, error: "Unable to load course lessons." };
    }

    lessons = lessonRows ?? [];
  }

  return {
    course: {
      ...course,
      modules: (modules ?? []).map((module) => ({
        ...module,
        lessons: lessons.filter((lesson) => lesson.module_id === module.id),
      })),
    },
    error: null,
  };
}
