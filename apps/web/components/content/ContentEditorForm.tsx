"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";

import { CopyContentButton } from "@/components/content/CopyContentButton";
import { DownloadContentButton } from "@/components/content/DownloadContentButton";
import { SourceReferenceList } from "@/components/courses/SourceReferenceList";
import { Alert } from "@/components/ui/Alert";
import {
  deleteGeneratedContentAction,
  duplicateGeneratedContentAction,
  updateGeneratedContentAction,
  type SaveContentState,
} from "@/lib/content/actions";
import type { GeneratedContent } from "@/types/database";

type ContentEditorFormProps = {
  item: GeneratedContent;
};

const initialState: SaveContentState = { ok: false };

export function ContentEditorForm({ item }: ContentEditorFormProps) {
  const router = useRouter();
  const boundUpdate = updateGeneratedContentAction.bind(
    null,
    item.id,
    item.project_id,
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);
  const [actionPending, startAction] = useTransition();

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="surface-card space-y-4 px-6 py-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold capitalize text-muted ring-1 ring-[var(--border)]">
            {item.platform ?? item.content_type}
          </span>
          <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold capitalize text-muted ring-1 ring-[var(--border)]">
            {item.generation_status}
          </span>
        </div>

        <div>
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="field-input"
            defaultValue={item.title}
            disabled={pending}
            required
          />
        </div>

        <div>
          <label htmlFor="body" className="field-label">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            className="field-input min-h-64 font-sans"
            defaultValue={item.body}
            disabled={pending}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="tone" className="field-label">
              Tone
            </label>
            <input
              id="tone"
              name="tone"
              className="field-input"
              defaultValue={item.tone ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="lengthLabel" className="field-label">
              Length
            </label>
            <input
              id="lengthLabel"
              name="lengthLabel"
              className="field-input"
              defaultValue={item.length_label ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="targetAudience" className="field-label">
              Target audience
            </label>
            <input
              id="targetAudience"
              name="targetAudience"
              className="field-input"
              defaultValue={item.target_audience ?? ""}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="generationStatus" className="field-label">
              Status
            </label>
            <select
              id="generationStatus"
              name="generationStatus"
              className="field-input"
              defaultValue={item.generation_status}
              disabled={pending}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="callToAction" className="field-label">
            Call to action
          </label>
          <input
            id="callToAction"
            name="callToAction"
            className="field-input"
            defaultValue={item.call_to_action ?? ""}
            disabled={pending}
          />
        </div>

        <div>
          <p className="field-label">Source references</p>
          <SourceReferenceList references={item.source_references ?? []} />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <DownloadContentButton contentId={item.id} format="md" />
        <DownloadContentButton contentId={item.id} format="txt" />
        <CopyContentButton contentId={item.id} format="txt" />
        <CopyContentButton contentId={item.id} format="md" />
        <Link href={`/projects/${item.project_id}`} className="btn-secondary">
          Back to project
        </Link>
        <button
          type="button"
          className="btn-secondary"
          disabled={actionPending}
          onClick={() => {
            startAction(async () => {
              const result = await duplicateGeneratedContentAction(
                item.id,
                item.project_id,
              );
              if (!result.ok) {
                window.alert(result.message ?? "Duplicate failed.");
              }
            });
          }}
        >
          {actionPending ? "Working…" : "Duplicate"}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
          disabled={actionPending}
          onClick={() => {
            const confirmed = window.confirm("Delete this content permanently?");
            if (!confirmed) return;
            startAction(async () => {
              const result = await deleteGeneratedContentAction(
                item.id,
                item.project_id,
              );
              if (!result.ok) {
                window.alert(result.message ?? "Delete failed.");
                return;
              }
              router.push(`/projects/${item.project_id}`);
            });
          }}
        >
          Delete
        </button>
      </div>
    </form>
  );
}
