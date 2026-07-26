"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAIProvider } from "@/lib/ai/provider";
import type { SourceReference } from "@/lib/ai/schemas/course";
import {
  hasCourseGeneratorErrors,
  validateCourseGeneratorInput,
  type CourseGeneratorFieldErrors,
} from "@/lib/courses/validation";
import { createClient } from "@/lib/supabase/server";

export type GenerateCourseState = {
  ok: boolean;
  message?: string;
  fieldErrors?: CourseGeneratorFieldErrors;
};

export type SaveCourseState = {
  ok: boolean;
  message?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function asStringArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function generateCourseAction(
  projectId: string,
  _prev: GenerateCourseState,
  formData: FormData,
): Promise<GenerateCourseState> {
  const sourceFileId = String(formData.get("sourceFileId") ?? "");
  const sectionIds = formData
    .getAll("sectionIds")
    .map(String)
    .filter(Boolean);
  const targetAudience = String(formData.get("targetAudience") ?? "");
  const courseObjective = String(formData.get("courseObjective") ?? "");
  const durationLabel = String(formData.get("durationLabel") ?? "");
  const moduleCount = Number(formData.get("moduleCount") ?? "3");
  const difficultyLevel = String(formData.get("difficultyLevel") ?? "beginner");

  const fieldErrors = validateCourseGeneratorInput({
    sourceFileId,
    sectionIds,
    targetAudience,
    courseObjective,
    durationLabel,
    moduleCount,
    difficultyLevel,
  });

  if (hasCourseGeneratorErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, message: "Project not found or inaccessible." };
  }

  const { data: sourceFile } = await supabase
    .from("source_files")
    .select("id, project_id, processing_status")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (
    !sourceFile ||
    sourceFile.project_id !== projectId ||
    sourceFile.processing_status !== "ready"
  ) {
    return {
      ok: false,
      message: "Select a processed document from this project.",
    };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("document_sections")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .in("id", sectionIds)
    .order("section_number", { ascending: true });

  if (sectionsError || !sections || sections.length === 0) {
    return {
      ok: false,
      message: "Unable to load the selected source sections.",
    };
  }

  try {
    const provider = getAIProvider();
    const outline = await provider.generateCourseOutline({
      targetAudience: targetAudience.trim(),
      courseObjective: courseObjective.trim(),
      durationLabel: durationLabel.trim(),
      moduleCount,
      difficultyLevel: difficultyLevel as
        | "beginner"
        | "intermediate"
        | "advanced",
      sections: sections.map((section) => ({
        id: section.id,
        sectionTitle: section.section_title,
        sectionNumber: section.section_number,
        pageStart: section.page_start,
        pageEnd: section.page_end,
        extractedText: section.extracted_text,
      })),
    });

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        project_id: projectId,
        source_file_id: sourceFileId,
        title: outline.title,
        description: outline.description,
        target_audience: outline.targetAudience,
        course_objective: courseObjective.trim(),
        duration_label: durationLabel.trim(),
        difficulty_level: difficultyLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        learning_outcomes: outline.learningOutcomes,
        quiz_suggestions: outline.quizSuggestions,
        source_references: outline.sourceReferences,
        status: "draft",
      })
      .select("id")
      .single();

    if (courseError || !course) {
      console.error("Failed to save course", courseError?.message);
      return { ok: false, message: "Unable to save the generated course." };
    }

    for (const [moduleIndex, moduleOutline] of outline.modules.entries()) {
      const { data: moduleRow, error: moduleError } = await supabase
        .from("course_modules")
        .insert({
          user_id: user.id,
          course_id: course.id,
          title: moduleOutline.title,
          description: moduleOutline.description,
          position: moduleIndex + 1,
          source_references: moduleOutline.sourceReferences,
        })
        .select("id")
        .single();

      if (moduleError || !moduleRow) {
        throw new Error("Failed to save a course module.");
      }

      const lessonRows = moduleOutline.lessons.map((lesson, lessonIndex) => ({
        user_id: user.id,
        module_id: moduleRow.id,
        title: lesson.title,
        learning_objectives: lesson.learningObjectives,
        lesson_content: lesson.summary,
        position: lessonIndex + 1,
        source_references: lesson.sourceReferences,
      }));

      const { error: lessonsError } = await supabase
        .from("course_lessons")
        .insert(lessonRows);

      if (lessonsError) {
        throw new Error("Failed to save course lessons.");
      }
    }

    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/courses/${course.id}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Course generation failed", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Course generation failed. Please try again.",
    };
  }
}

export async function updateCourseAction(
  courseId: string,
  projectId: string,
  _prev: SaveCourseState,
  formData: FormData,
): Promise<SaveCourseState> {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetAudience = String(formData.get("targetAudience") ?? "").trim();
  const courseObjective = String(formData.get("courseObjective") ?? "").trim();
  const durationLabel = String(formData.get("durationLabel") ?? "").trim();
  const difficultyLevel = String(
    formData.get("difficultyLevel") ?? "beginner",
  ) as "beginner" | "intermediate" | "advanced";
  const learningOutcomes = asStringArray(formData.get("learningOutcomes"));
  const quizSuggestions = asStringArray(formData.get("quizSuggestions"));
  const status = String(formData.get("status") ?? "draft") as
    | "draft"
    | "ready"
    | "archived";

  if (!title) {
    return { ok: false, message: "Course title is required." };
  }

  const { data: course, error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      target_audience: targetAudience,
      course_objective: courseObjective,
      duration_label: durationLabel,
      difficulty_level: difficultyLevel,
      learning_outcomes: learningOutcomes,
      quiz_suggestions: quizSuggestions,
      status,
    })
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (error || !course) {
    return { ok: false, message: "Unable to save course changes." };
  }

  const moduleIds = formData.getAll("moduleId").map(String);
  for (const moduleId of moduleIds) {
    const moduleTitle = String(formData.get(`moduleTitle_${moduleId}`) ?? "").trim();
    const moduleDescription = String(
      formData.get(`moduleDescription_${moduleId}`) ?? "",
    ).trim();

    if (!moduleTitle) continue;

    await supabase
      .from("course_modules")
      .update({
        title: moduleTitle,
        description: moduleDescription,
      })
      .eq("id", moduleId);

    const lessonIds = formData.getAll(`lessonId_${moduleId}`).map(String);
    for (const lessonId of lessonIds) {
      const lessonTitle = String(
        formData.get(`lessonTitle_${lessonId}`) ?? "",
      ).trim();
      const lessonContent = String(
        formData.get(`lessonContent_${lessonId}`) ?? "",
      ).trim();
      const objectives = asStringArray(
        formData.get(`lessonObjectives_${lessonId}`),
      );

      if (!lessonTitle) continue;

      await supabase
        .from("course_lessons")
        .update({
          title: lessonTitle,
          lesson_content: lessonContent,
          learning_objectives: objectives,
        })
        .eq("id", lessonId);
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/courses/${courseId}`);
  return { ok: true, message: "Course saved." };
}

export async function deleteCourseAction(
  courseId: string,
  projectId: string,
): Promise<SaveCourseState> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) {
    return { ok: false, message: "Unable to delete this course." };
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export type { SourceReference };
