"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import type { VideoStoryboardMode } from "@/lib/ai/schemas/video";
import {
  generateVideoAction,
  type GenerateVideoState,
} from "@/lib/videos/generate-actions";

type GenerateVideoFormProps = {
  projectId: string;
  disabled?: boolean;
};

const initialState: GenerateVideoState = { ok: false };

const PLACEHOLDERS: Record<VideoStoryboardMode, string> = {
  TEXT_TO_VIDEO:
    "Describe your video. e.g. A calm morning by the ocean. The sun rises slowly. Gentle waves roll onto the shore. A new day begins.",
  SCRIPT_TO_FILM:
    "Paste your script. Separate scenes with blank lines or INT./EXT. headings and each becomes a segment of the film.",
};

export function GenerateVideoForm({
  projectId,
  disabled = false,
}: GenerateVideoFormProps) {
  const boundAction = generateVideoAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [mode, setMode] = useState<VideoStoryboardMode>("TEXT_TO_VIDEO");

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}
      {state.message && state.ok ? (
        <Alert tone="success">
          {state.message}{" "}
          <Link href={`/projects/${projectId}/videos`} className="font-semibold underline">
            View videos
          </Link>
        </Alert>
      ) : null}

      <div className="surface-card space-y-4 px-6 py-6">
        <div>
          <span className="field-label">Mode</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["TEXT_TO_VIDEO", "SCRIPT_TO_FILM"] as VideoStoryboardMode[]).map(
              (option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${
                    mode === option
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--border)] bg-white/70 text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={option}
                    className="sr-only"
                    checked={mode === option}
                    onChange={() => setMode(option)}
                    disabled={pending || disabled}
                  />
                  {option === "TEXT_TO_VIDEO" ? "Text → Video" : "Script → Film"}
                </label>
              ),
            )}
          </div>
          {state.fieldErrors?.mode ? (
            <p className="field-error">{state.fieldErrors.mode}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="title" className="field-label">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="field-input"
            placeholder="Untitled video"
            maxLength={200}
            disabled={pending || disabled}
            required
          />
          {state.fieldErrors?.title ? (
            <p className="field-error">{state.fieldErrors.title}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="sourceText" className="field-label">
            {mode === "SCRIPT_TO_FILM" ? "Script" : "Prompt / text"}
          </label>
          <textarea
            id="sourceText"
            name="sourceText"
            className="field-input min-h-40"
            placeholder={PLACEHOLDERS[mode]}
            disabled={pending || disabled}
            required
          />
          {state.fieldErrors?.sourceText ? (
            <p className="field-error">{state.fieldErrors.sourceText}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={pending || disabled}>
          {pending ? "Queuing…" : "Generate video"}
        </button>
        <Link href={`/projects/${projectId}/videos`} className="btn-secondary">
          View videos
        </Link>
      </div>

      <p className="text-sm text-muted">
        Storyboards use the mock AI provider (`AI_PROVIDER=mock`); frames are
        rendered to a real MP4 with FFmpeg on the API and stored privately.
      </p>
    </form>
  );
}
