import { describe, expect, it } from "vitest";

import {
  buildContentMarkdown,
  buildContentPlainText,
  contentExportFilename,
} from "@/lib/content/export";
import {
  buildCourseMarkdown,
  courseExportFilename,
} from "@/lib/courses/export";
import type { CourseWithStructure } from "@/lib/courses/queries";
import type { GeneratedContent } from "@/types/database";

const course: CourseWithStructure = {
  id: "c1",
  user_id: "u1",
  project_id: "p1",
  source_file_id: "f1",
  title: "Teaching Systems Thinking",
  description: "A grounded outline.",
  target_audience: "Creators",
  course_objective: "Explain feedback loops",
  duration_label: "90 minutes",
  difficulty_level: "beginner",
  learning_outcomes: ["Define feedback loops", "Map a simple system"],
  quiz_suggestions: ["What is a reinforcing loop?"],
  source_references: [
    {
      sectionId: "s1",
      sectionTitle: "Intro",
      sectionNumber: 1,
      pageStart: 1,
      pageEnd: 2,
    },
  ],
  status: "draft",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  modules: [
    {
      id: "m1",
      user_id: "u1",
      course_id: "c1",
      title: "Foundations",
      description: "Core ideas",
      position: 1,
      source_references: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      lessons: [
        {
          id: "l1",
          user_id: "u1",
          module_id: "m1",
          title: "Loops",
          learning_objectives: ["Name two loop types"],
          lesson_content: "Start with a stock and a flow.",
          position: 1,
          source_references: [
            {
              sectionId: "s1",
              sectionTitle: "Intro",
              sectionNumber: 1,
              pageStart: 1,
              pageEnd: 1,
            },
          ],
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  ],
};

const content: GeneratedContent = {
  id: "g1",
  user_id: "u1",
  project_id: "p1",
  source_file_id: "f1",
  content_type: "linkedin_post",
  title: "Share the loop",
  body: "Systems hide in plain sight.",
  tone: "practical",
  length_label: "short",
  target_audience: "operators",
  call_to_action: "Save this note.",
  platform: "linkedin",
  generation_status: "draft",
  source_references: [
    {
      sectionId: "s1",
      sectionTitle: "Intro",
      sectionNumber: 1,
      pageStart: 1,
      pageEnd: 2,
    },
  ],
  duplicated_from_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("buildCourseMarkdown", () => {
  it("includes title, modules, lessons, and references", () => {
    const markdown = buildCourseMarkdown(course);
    expect(markdown).toContain("# Teaching Systems Thinking");
    expect(markdown).toContain("## Module 1: Foundations");
    expect(markdown).toContain("### Lesson 1.1: Loops");
    expect(markdown).toContain("Start with a stock and a flow.");
    expect(markdown).toContain("Intro");
    expect(courseExportFilename(course.title)).toBe(
      "teaching-systems-thinking.md",
    );
  });
});

describe("content export builders", () => {
  it("builds markdown with metadata and body", () => {
    const markdown = buildContentMarkdown(content);
    expect(markdown).toContain("# Share the loop");
    expect(markdown).toContain("linkedin");
    expect(markdown).toContain("Systems hide in plain sight.");
    expect(markdown).toContain("Save this note.");
  });

  it("builds plain text optimized for pasting", () => {
    const text = buildContentPlainText(content);
    expect(text).toContain("Share the loop");
    expect(text).toContain("Systems hide in plain sight.");
    expect(text).toContain("Save this note.");
    expect(contentExportFilename(content.title, "txt")).toBe(
      "share-the-loop.txt",
    );
  });
});
