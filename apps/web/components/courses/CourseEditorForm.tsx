"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SourceReferenceList } from "@/components/courses/SourceReferenceList";
import { Alert } from "@/components/ui/Alert";
import {
  deleteCourseAction,
  updateCourseAction,
  type SaveCourseState,
} from "@/lib/courses/actions";
import type { CourseWithStructure } from "@/lib/courses/queries";

type CourseEditorFormProps = {
  course: CourseWithStructure;
};

const initialState: SaveCourseState = { ok: false };

export function CourseEditorForm({ course }: CourseEditorFormProps) {
  const router = useRouter();
  const boundUpdate = updateCourseAction.bind(null, course.id, course.project_id);
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);
  const [deletePending, startDelete] = useTransition();

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="surface-card space-y-4 px-6 py-6">
        <div>
          <label htmlFor="title" className="field-label">
            Course title
          </label>
          <input
            id="title"
            name="title"
            className="field-input"
            defaultValue={course.title}
            disabled={pending}
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="field-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="field-input min-h-28"
            defaultValue={course.description ?? ""}
            disabled={pending}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="targetAudience" className="field-label">
              Target audience
            </label>
            <input
              id="targetAudience"
              name="targetAudience"
              className="field-input"
              defaultValue={course.target_audience ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="durationLabel" className="field-label">
              Duration
            </label>
            <input
              id="durationLabel"
              name="durationLabel"
              className="field-input"
              defaultValue={course.duration_label ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="difficultyLevel" className="field-label">
              Difficulty
            </label>
            <select
              id="difficultyLevel"
              name="difficultyLevel"
              className="field-input"
              defaultValue={course.difficulty_level}
              disabled={pending}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="field-input"
              defaultValue={course.status}
              disabled={pending}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="courseObjective" className="field-label">
            Course objective
          </label>
          <textarea
            id="courseObjective"
            name="courseObjective"
            className="field-input min-h-24"
            defaultValue={course.course_objective ?? ""}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="learningOutcomes" className="field-label">
            Learning outcomes (one per line)
          </label>
          <textarea
            id="learningOutcomes"
            name="learningOutcomes"
            className="field-input min-h-28"
            defaultValue={(course.learning_outcomes ?? []).join("\n")}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="quizSuggestions" className="field-label">
            Quiz suggestions (one per line)
          </label>
          <textarea
            id="quizSuggestions"
            name="quizSuggestions"
            className="field-input min-h-28"
            defaultValue={(course.quiz_suggestions ?? []).join("\n")}
            disabled={pending}
          />
        </div>
        <div>
          <p className="field-label">Source references</p>
          <SourceReferenceList references={course.source_references ?? []} />
        </div>
      </div>

      {course.modules.map((module) => (
        <section key={module.id} className="surface-card space-y-4 px-6 py-6">
          <input type="hidden" name="moduleId" value={module.id} />
          <div>
            <label
              htmlFor={`moduleTitle_${module.id}`}
              className="field-label"
            >
              Module {module.position} title
            </label>
            <input
              id={`moduleTitle_${module.id}`}
              name={`moduleTitle_${module.id}`}
              className="field-input"
              defaultValue={module.title}
              disabled={pending}
            />
          </div>
          <div>
            <label
              htmlFor={`moduleDescription_${module.id}`}
              className="field-label"
            >
              Module description
            </label>
            <textarea
              id={`moduleDescription_${module.id}`}
              name={`moduleDescription_${module.id}`}
              className="field-input min-h-24"
              defaultValue={module.description ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <p className="field-label">Module source references</p>
            <SourceReferenceList references={module.source_references ?? []} />
          </div>

          {module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-xl border border-[var(--border)] bg-white/70 p-4"
            >
              <input
                type="hidden"
                name={`lessonId_${module.id}`}
                value={lesson.id}
              />
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`lessonTitle_${lesson.id}`}
                    className="field-label"
                  >
                    Lesson {lesson.position} title
                  </label>
                  <input
                    id={`lessonTitle_${lesson.id}`}
                    name={`lessonTitle_${lesson.id}`}
                    className="field-input"
                    defaultValue={lesson.title}
                    disabled={pending}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`lessonContent_${lesson.id}`}
                    className="field-label"
                  >
                    Lesson summary
                  </label>
                  <textarea
                    id={`lessonContent_${lesson.id}`}
                    name={`lessonContent_${lesson.id}`}
                    className="field-input min-h-24"
                    defaultValue={lesson.lesson_content}
                    disabled={pending}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`lessonObjectives_${lesson.id}`}
                    className="field-label"
                  >
                    Learning objectives (one per line)
                  </label>
                  <textarea
                    id={`lessonObjectives_${lesson.id}`}
                    name={`lessonObjectives_${lesson.id}`}
                    className="field-input min-h-24"
                    defaultValue={(lesson.learning_objectives ?? []).join("\n")}
                    disabled={pending}
                  />
                </div>
                <div>
                  <p className="field-label">Lesson source references</p>
                  <SourceReferenceList
                    references={lesson.source_references ?? []}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>
      ))}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/projects/${course.project_id}`} className="btn-secondary">
          Back to project
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
          disabled={deletePending}
          onClick={() => {
            const confirmed = window.confirm(
              "Delete this course and all modules/lessons?",
            );
            if (!confirmed) return;
            startDelete(async () => {
              const result = await deleteCourseAction(
                course.id,
                course.project_id,
              );
              if (!result.ok) {
                window.alert(result.message ?? "Delete failed.");
                return;
              }
              router.push(`/projects/${course.project_id}`);
            });
          }}
        >
          {deletePending ? "Deleting…" : "Delete course"}
        </button>
      </div>
    </form>
  );
}
