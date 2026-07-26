"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAIProvider } from "@/lib/ai/provider";
import type { SourceReference } from "@/lib/ai/schemas/course";
import {
  hasCourseGeneratorErrors,
  validateCourseGeneratorInput,
  type CourseGeneratorFieldErrors,
} from "@/lib/courses/validation";
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import { isAsyncAiGenerationEnabled } from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";

export type GenerateCourseState = {
  ok: boolean;
  message?: string;
  fieldErrors?: CourseGeneratorFieldErrors;
  queued?: boolean;
  jobId?: string;
  courseId?: string;
};

export type SaveCourseState = {
  ok: boolean;
  message?: string;
};

export type CourseGenerateInput = {
  sourceFileId: string;
  sectionIds: string[];
  targetAudience: string;
  courseObjective: string;
  durationLabel: string;
  moduleCount: number;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
};

type CourseJobPayload = CourseGenerateInput & {
  resultCourseId?: string;
};

type EnqueuedCourseGenerate = {
  projectId: string;
  jobId: string;
  userId: string;
  input: CourseGenerateInput;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function isRedirectError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT"),
  );
}

function asStringArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCoursePayload(raw: unknown): CourseJobPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.sourceFileId !== "string" ||
    !Array.isArray(value.sectionIds) ||
    typeof value.targetAudience !== "string" ||
    typeof value.courseObjective !== "string" ||
    typeof value.durationLabel !== "string" ||
    typeof value.moduleCount !== "number" ||
    (value.difficultyLevel !== "beginner" &&
      value.difficultyLevel !== "intermediate" &&
      value.difficultyLevel !== "advanced")
  ) {
    return null;
  }
  return {
    sourceFileId: value.sourceFileId,
    sectionIds: value.sectionIds.map(String).filter(Boolean),
    targetAudience: value.targetAudience,
    courseObjective: value.courseObjective,
    durationLabel: value.durationLabel,
    moduleCount: value.moduleCount,
    difficultyLevel: value.difficultyLevel,
    resultCourseId:
      typeof value.resultCourseId === "string" ? value.resultCourseId : undefined,
  };
}

async function enqueueCourseGenerate(input: {
  projectId: string;
  form: CourseGenerateInput;
  existingJobId?: string;
}): Promise<
  | { ok: true; work: EnqueuedCourseGenerate }
  | { ok: false; message: string; fieldErrors?: CourseGeneratorFieldErrors }
> {
  const fieldErrors = validateCourseGeneratorInput(input.form);
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
    .eq("id", input.projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, message: "Project not found or inaccessible." };
  }

  const { data: sourceFile } = await supabase
    .from("source_files")
    .select("id, project_id, processing_status")
    .eq("id", input.form.sourceFileId)
    .maybeSingle();

  if (
    !sourceFile ||
    sourceFile.project_id !== input.projectId ||
    sourceFile.processing_status !== "ready"
  ) {
    return {
      ok: false,
      message: "Select a processed document from this project.",
    };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("document_sections")
    .select("id")
    .eq("source_file_id", input.form.sourceFileId)
    .in("id", input.form.sectionIds);

  if (sectionsError || !sections || sections.length === 0) {
    return {
      ok: false,
      message: "Unable to load the selected source sections.",
    };
  }

  const payload: CourseJobPayload = { ...input.form };
  let jobId = input.existingJobId;

  if (jobId) {
    const { data: existing } = await supabase
      .from("processing_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!existing || existing.user_id !== user.id) {
      return { ok: false, message: "Processing job not found or inaccessible." };
    }
    await supabase
      .from("processing_jobs")
      .update({
        status: "queued",
        progress_percentage: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
        payload,
      })
      .eq("id", jobId);
  } else {
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        project_id: input.projectId,
        source_file_id: input.form.sourceFileId,
        job_type: "course_generate",
        status: "queued",
        progress_percentage: 0,
        payload,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create course job", jobError?.message);
      return { ok: false, message: "Unable to start course generation." };
    }
    jobId = job.id;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${input.projectId}`);

  return {
    ok: true,
    work: {
      projectId: input.projectId,
      jobId,
      userId: user.id,
      input: input.form,
    },
  };
}

async function executeCourseGenerate(
  work: EnqueuedCourseGenerate,
): Promise<GenerateCourseState> {
  const supabase = await createClient();
  const { projectId, jobId, userId, input } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 15);
  if (!started) {
    return { ok: false, message: "This job was cancelled." };
  }

  try {
    const { data: sections, error: sectionsError } = await supabase
      .from("document_sections")
      .select("*")
      .eq("source_file_id", input.sourceFileId)
      .in("id", input.sectionIds)
      .order("section_number", { ascending: true });

    if (sectionsError || !sections || sections.length === 0) {
      throw new Error("Unable to load the selected source sections.");
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 40);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, message: "This job was cancelled." };
    }

    const provider = getAIProvider();
    const outline = await provider.generateCourseOutline({
      targetAudience: input.targetAudience.trim(),
      courseObjective: input.courseObjective.trim(),
      durationLabel: input.durationLabel.trim(),
      moduleCount: input.moduleCount,
      difficultyLevel: input.difficultyLevel,
      sections: sections.map((section) => ({
        id: section.id,
        sectionTitle: section.section_title,
        sectionNumber: section.section_number,
        pageStart: section.page_start,
        pageEnd: section.page_end,
        extractedText: section.extracted_text,
      })),
    });

    await bumpProcessingJobProgressIfActive(supabase, jobId, 70);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, message: "This job was cancelled." };
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: userId,
        project_id: projectId,
        source_file_id: input.sourceFileId,
        title: outline.title,
        description: outline.description,
        target_audience: outline.targetAudience,
        course_objective: input.courseObjective.trim(),
        duration_label: input.durationLabel.trim(),
        difficulty_level: input.difficultyLevel,
        learning_outcomes: outline.learningOutcomes,
        quiz_suggestions: outline.quizSuggestions,
        source_references: outline.sourceReferences,
        status: "draft",
      })
      .select("id")
      .single();

    if (courseError || !course) {
      console.error("Failed to save course", courseError?.message);
      throw new Error("Unable to save the generated course.");
    }

    for (const [moduleIndex, moduleOutline] of outline.modules.entries()) {
      const { data: moduleRow, error: moduleError } = await supabase
        .from("course_modules")
        .insert({
          user_id: userId,
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
        user_id: userId,
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

    const completedPayload: CourseJobPayload = {
      ...input,
      resultCourseId: course.id,
    };

    const completed = await completeProcessingJobIfActive(supabase, jobId, {
      payload: completedPayload,
    });
    if (!completed) {
      return { ok: false, message: "This job was cancelled." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/courses/${course.id}`);

    return {
      ok: true,
      jobId,
      courseId: course.id,
      message: "Course outline generated.",
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error
        ? error.message
        : "Course generation failed. Please try again.";

    await failProcessingJobIfActive(supabase, jobId, message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: false, message };
  }
}

export async function generateCourseAction(
  projectId: string,
  _prev: GenerateCourseState,
  formData: FormData,
): Promise<GenerateCourseState> {
  const form: CourseGenerateInput = {
    sourceFileId: String(formData.get("sourceFileId") ?? ""),
    sectionIds: formData.getAll("sectionIds").map(String).filter(Boolean),
    targetAudience: String(formData.get("targetAudience") ?? ""),
    courseObjective: String(formData.get("courseObjective") ?? ""),
    durationLabel: String(formData.get("durationLabel") ?? ""),
    moduleCount: Number(formData.get("moduleCount") ?? "3"),
    difficultyLevel: String(formData.get("difficultyLevel") ?? "beginner") as
      | "beginner"
      | "intermediate"
      | "advanced",
  };

  const queued = await enqueueCourseGenerate({ projectId, form });
  if (!queued.ok) {
    return {
      ok: false,
      message: queued.message,
      fieldErrors: queued.fieldErrors,
    };
  }

  if (isAsyncAiGenerationEnabled()) {
    after(() => {
      void executeCourseGenerate(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Course generation queued. Watch the jobs list; open the new course from the project when ready.",
    };
  }

  const result = await executeCourseGenerate(queued.work);
  if (!result.ok || !result.courseId) {
    return result;
  }

  redirect(`/projects/${projectId}/courses/${result.courseId}`);
}

export async function retryCourseGenerateAction(
  jobId: string,
): Promise<{ ok: true; message: string; jobId: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id || job.job_type !== "course_generate") {
    return { ok: false, error: "Course generation job not found or inaccessible." };
  }

  const payload = parseCoursePayload(job.payload);
  if (!payload) {
    return { ok: false, error: "This job is missing generation inputs to retry." };
  }

  const queued = await enqueueCourseGenerate({
    projectId: job.project_id,
    form: {
      sourceFileId: payload.sourceFileId,
      sectionIds: payload.sectionIds,
      targetAudience: payload.targetAudience,
      courseObjective: payload.courseObjective,
      durationLabel: payload.durationLabel,
      moduleCount: payload.moduleCount,
      difficultyLevel: payload.difficultyLevel,
    },
    existingJobId: job.id,
  });

  if (!queued.ok) {
    return { ok: false, error: queued.message };
  }

  if (isAsyncAiGenerationEnabled()) {
    after(() => {
      void executeCourseGenerate(queued.work);
    });
    return {
      ok: true,
      jobId: queued.work.jobId,
      message: "Course generation re-queued.",
    };
  }

  const result = await executeCourseGenerate(queued.work);
  if (!result.ok) {
    return { ok: false, error: result.message || "Course generation failed." };
  }
  return {
    ok: true,
    jobId: result.jobId ?? queued.work.jobId,
    message: result.message || "Course outline generated.",
  };
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
