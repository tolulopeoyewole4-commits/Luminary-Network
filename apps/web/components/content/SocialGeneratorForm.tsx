"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  SOCIAL_LENGTHS,
  SOCIAL_PLATFORMS,
  SOCIAL_TONES,
} from "@/lib/ai/schemas/social";
import {
  generateSocialContentAction,
  type GenerateSocialState,
} from "@/lib/content/actions";
import type { DocumentSection } from "@/types/database";

type SocialGeneratorFormProps = {
  projectId: string;
  files: Array<{
    id: string;
    original_filename: string;
    sections: DocumentSection[];
  }>;
};

const initialState: GenerateSocialState = { ok: false };

const PLATFORM_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  linkedin: "LinkedIn post",
  instagram: "Instagram caption",
  x: "X thread",
  youtube: "YouTube script",
  tiktok: "TikTok / Reel script",
  newsletter: "Newsletter",
  blog: "Blog outline",
};

export function SocialGeneratorForm({
  projectId,
  files,
}: SocialGeneratorFormProps) {
  const boundAction = generateSocialContentAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [sourceFileId, setSourceFileId] = useState(files[0]?.id ?? "");

  const selectedFile = useMemo(
    () => files.find((file) => file.id === sourceFileId) ?? null,
    [files, sourceFileId],
  );

  if (files.length === 0) {
    return (
      <Alert tone="info">
        Process at least one PDF, DOCX, or TXT before generating social content.{" "}
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
          <legend className="field-label">Source sections</legend>
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
                          section.page_end &&
                          section.page_end !== section.page_start
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
        <div>
          <label htmlFor="platform" className="field-label">
            Platform
          </label>
          <select
            id="platform"
            name="platform"
            className="field-input"
            defaultValue="linkedin"
            disabled={pending}
          >
            {SOCIAL_PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.platform ? (
            <p className="field-error">{state.fieldErrors.platform}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="tone" className="field-label">
            Tone
          </label>
          <select
            id="tone"
            name="tone"
            className="field-input"
            defaultValue="professional"
            disabled={pending}
          >
            {SOCIAL_TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
          {state.fieldErrors?.tone ? (
            <p className="field-error">{state.fieldErrors.tone}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="length" className="field-label">
            Length
          </label>
          <select
            id="length"
            name="length"
            className="field-input"
            defaultValue="medium"
            disabled={pending}
          >
            {SOCIAL_LENGTHS.map((length) => (
              <option key={length} value={length}>
                {length}
              </option>
            ))}
          </select>
          {state.fieldErrors?.length ? (
            <p className="field-error">{state.fieldErrors.length}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="outputCount" className="field-label">
            Number of outputs
          </label>
          <input
            id="outputCount"
            name="outputCount"
            type="number"
            min={1}
            max={5}
            defaultValue={2}
            className="field-input"
            disabled={pending}
          />
          {state.fieldErrors?.outputCount ? (
            <p className="field-error">{state.fieldErrors.outputCount}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="targetAudience" className="field-label">
            Target audience
          </label>
          <input
            id="targetAudience"
            name="targetAudience"
            className="field-input"
            defaultValue="Knowledge creators and professionals"
            disabled={pending}
            required
          />
          {state.fieldErrors?.targetAudience ? (
            <p className="field-error">{state.fieldErrors.targetAudience}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="callToAction" className="field-label">
            Call to action
          </label>
          <input
            id="callToAction"
            name="callToAction"
            className="field-input"
            defaultValue="Save this insight and share it with someone who needs it."
            disabled={pending}
            required
          />
          {state.fieldErrors?.callToAction ? (
            <p className="field-error">{state.fieldErrors.callToAction}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Generating…" : "Generate content"}
        </button>
        <Link href={`/projects/${projectId}`} className="btn-secondary">
          Cancel
        </Link>
      </div>

      <p className="text-sm text-muted">
        Uses `AI_PROVIDER=mock`. Every output keeps source section references and
        can be edited or duplicated after saving.
      </p>
    </form>
  );
}
