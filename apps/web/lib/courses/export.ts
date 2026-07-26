import type { CourseWithStructure } from "@/lib/courses/queries";
import type { CourseSourceReference } from "@/types/database";

function slugifyFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "course";
}

function formatReferences(references: CourseSourceReference[] | null | undefined): string {
  if (!references?.length) return "";
  const lines = references.map((ref) => {
    const pages =
      ref.pageStart != null || ref.pageEnd != null
        ? ` (pp. ${ref.pageStart ?? "?"}${
            ref.pageEnd != null && ref.pageEnd !== ref.pageStart
              ? `–${ref.pageEnd}`
              : ""
          })`
        : "";
    return `- ${ref.sectionTitle}${pages}`;
  });
  return lines.join("\n");
}

/** Build a portable Markdown outline from a structured course. */
export function buildCourseMarkdown(course: CourseWithStructure): string {
  const parts: string[] = [`# ${course.title.trim() || "Untitled course"}`, ""];

  if (course.description?.trim()) {
    parts.push(course.description.trim(), "");
  }

  const meta: string[] = [];
  if (course.target_audience?.trim()) {
    meta.push(`- **Audience:** ${course.target_audience.trim()}`);
  }
  if (course.course_objective?.trim()) {
    meta.push(`- **Objective:** ${course.course_objective.trim()}`);
  }
  if (course.duration_label?.trim()) {
    meta.push(`- **Duration:** ${course.duration_label.trim()}`);
  }
  if (course.difficulty_level) {
    meta.push(`- **Difficulty:** ${course.difficulty_level}`);
  }
  if (meta.length) {
    parts.push("## Overview", "", ...meta, "");
  }

  if (course.learning_outcomes?.length) {
    parts.push("## Learning outcomes", "");
    for (const outcome of course.learning_outcomes) {
      if (outcome.trim()) parts.push(`- ${outcome.trim()}`);
    }
    parts.push("");
  }

  for (const [moduleIndex, module] of course.modules.entries()) {
    parts.push(`## Module ${moduleIndex + 1}: ${module.title.trim()}`, "");
    if (module.description?.trim()) {
      parts.push(module.description.trim(), "");
    }
    const moduleRefs = formatReferences(module.source_references);
    if (moduleRefs) {
      parts.push("**Source references**", "", moduleRefs, "");
    }

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      parts.push(
        `### Lesson ${moduleIndex + 1}.${lessonIndex + 1}: ${lesson.title.trim()}`,
        "",
      );
      if (lesson.learning_objectives?.length) {
        parts.push("**Objectives**", "");
        for (const objective of lesson.learning_objectives) {
          if (objective.trim()) parts.push(`- ${objective.trim()}`);
        }
        parts.push("");
      }
      if (lesson.lesson_content?.trim()) {
        parts.push(lesson.lesson_content.trim(), "");
      }
      const lessonRefs = formatReferences(lesson.source_references);
      if (lessonRefs) {
        parts.push("**Source references**", "", lessonRefs, "");
      }
    }
  }

  if (course.quiz_suggestions?.length) {
    parts.push("## Quiz suggestions", "");
    for (const suggestion of course.quiz_suggestions) {
      if (suggestion.trim()) parts.push(`- ${suggestion.trim()}`);
    }
    parts.push("");
  }

  const courseRefs = formatReferences(course.source_references);
  if (courseRefs) {
    parts.push("## Course source references", "", courseRefs, "");
  }

  parts.push("---", "", "_Exported from Luminary AI_", "");
  return parts.join("\n");
}

export function courseExportFilename(title: string): string {
  return `${slugifyFilename(title)}.md`;
}
