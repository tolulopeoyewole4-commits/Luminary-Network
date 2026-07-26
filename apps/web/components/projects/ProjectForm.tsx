"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  type ProjectType,
} from "@/lib/projects/constants";
import type { ProjectActionState } from "@/lib/projects/types";

type ProjectFormProps = {
  action: (
    prev: ProjectActionState,
    formData: FormData,
  ) => Promise<ProjectActionState>;
  submitLabel: string;
  cancelHref: string;
  initialValues?: {
    name: string;
    description: string;
    projectType: ProjectType;
  };
};

const initialState: ProjectActionState = { ok: false };

export function ProjectForm({
  action,
  submitLabel,
  cancelHref,
  initialValues,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="surface-card space-y-5 px-6 py-7">
      {state.message && !state.ok ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      <div>
        <label htmlFor="name" className="field-label">
          Project name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="field-input"
          defaultValue={initialValues?.name ?? ""}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          required
          disabled={pending}
          placeholder="e.g. Leadership Sermon Series"
        />
        {state.fieldErrors?.name ? (
          <p className="field-error">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          className="field-input min-h-28 resize-y"
          defaultValue={initialValues?.description ?? ""}
          maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
          disabled={pending}
          placeholder="What knowledge will this project transform?"
        />
        {state.fieldErrors?.description ? (
          <p className="field-error">{state.fieldErrors.description}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="projectType" className="field-label">
          Project type
        </label>
        <select
          id="projectType"
          name="projectType"
          className="field-input"
          defaultValue={initialValues?.projectType ?? "mixed"}
          disabled={pending}
        >
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROJECT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.projectType ? (
          <p className="field-error">{state.fieldErrors.projectType}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
