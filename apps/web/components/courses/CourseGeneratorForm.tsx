"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  generateCourseAction,
  type GenerateCourseState,
} from "@/lib/courses/actions";
import type { DocumentSection } from "@/types/database";

type CourseGeneratorFormProps = {
  projectId: string;
  files: Array<{
    id: string;
    original_filename: string;
    sections: DocumentSection[];
  }>;
};

const initialState: GenerateCourseState = { ok: false };

export function CourseGeneratorForm({
  projectId,
  files,
}: CourseGeneratorFormProps) {
  const boundAction = generateCourseAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [sourceFileId, setSourceFileId] = useState(files[0]?.id ?? "");

  const selectedFile = useMemo(
    () => files.find((file) => file.id === sourceFileId) ?? null,
    [files, sourceFileId],
  );

  if (files.length === 0) {
    return (
      <Alert tone="info">
        Process at least one PDF, DOCX, or TXT in this project before generating a
        course.{" "}
        <Link href={`/projects/${projectId}`} className="font-semibold underline">
          Back to project
        </Link>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      <div className="surface-card space-y-4 px-6 py-6">
        <div>
          <label htmlFor="sourceFileId" className="field-label">
            Source document
          </label>
          <select
            id="sourceFileId"
            name="sourceFileId"
            className="field-input"
            value={sourceFileId}
            onChange={(event) => setSourceFileId(event.target.value)}
            disabled={pending}
          >
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.original_filename} ({file.sections.length} sections)
              </option>
            ))}
          </select>
          {state.fieldErrors?.sourceFileId ? (
            <p className="field-error">{state.fieldErrors.sourceFileId}</p>
          ) : null}
        </div>

        <fieldset>
          <legend className="field-label">Chapters / sections</legend>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-white/70 p-3">
            {(selectedFile?.sections ?? []).map((section) => (
              <label
                key={section.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-white"
              >
                <input
                  type="checkbox"
                  name="sectionIds"
                  value={section.id}
                  defaultChecked
                  disabled={pending}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="font-semibold">
                    {section.section_number}. {section.section_title}
                  </span>
                  <span className="mt-1 block text-muted">
                    {section.page_start
                      ? `Pages ${section.page_start}${
                          section.page_end && section.page_end !== section.page_start
                            ? `–${section.page_end}`
                            : ""
                        }`
                      : "No page reference"}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {state.fieldErrors?.sectionIds ? (
            <p className="field-error">{state.fieldErrors.sectionIds}</p>
          ) : null}
        </fieldset>
      </div>

      <div className="surface-card grid gap-4 px-6 py-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="courseObjective" className="field-label">
            Course objective
          </label>
          <textarea
            id="courseObjective"
            name="courseObjective"
            className="field-input min-h-24"
            defaultValue="Help learners understand and apply the selected source material."
            disabled={pending}
            required
          />
          {state.fieldErrors?.courseObjective ? (
            <p className="field-error">{state.fieldErrors.courseObjective}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="targetAudience" className="field-label">
            Target audience
          </label>
          <input
            id="targetAudience"
            name="targetAudience"
            className="field-input"
            defaultValue="Adult learners and knowledge creators"
            disabled={pending}
            required
          />
          {state.fieldErrors?.targetAudience ? (
            <p className="field-error">{state.fieldErrors.targetAudience}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="durationLabel" className="field-label">
            Course duration
          </label>
          <input
            id="durationLabel"
            name="durationLabel"
            className="field-input"
            defaultValue="4 weeks"
            disabled={pending}
            required
          />
          {state.fieldErrors?.durationLabel ? (
            <p className="field-error">{state.fieldErrors.durationLabel}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="moduleCount" className="field-label">
            Number of modules
          </label>
          <input
            id="moduleCount"
            name="moduleCount"
            type="number"
            min={1}
            max={12}
            defaultValue={3}
            className="field-input"
            disabled={pending}
            required
          />
          {state.fieldErrors?.moduleCount ? (
            <p className="field-error">{state.fieldErrors.moduleCount}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="difficultyLevel" className="field-label">
            Difficulty level
          </label>
          <select
            id="difficultyLevel"
            name="difficultyLevel"
            className="field-input"
            defaultValue="beginner"
            disabled={pending}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {state.fieldErrors?.difficultyLevel ? (
            <p className="field-error">{state.fieldErrors.difficultyLevel}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Generating outline…" : "Generate course outline"}
        </button>
        <Link href={`/projects/${projectId}`} className="btn-secondary">
          Cancel
        </Link>
      </div>

      <p className="text-sm text-muted">
        Uses the mock AI provider (`AI_PROVIDER=mock`). Outputs stay grounded in
        the selected sections and remain editable before publishing.
      </p>
    </form>
  );
}
