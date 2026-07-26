"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { ExportClipButton } from "@/components/clips/ExportClipButton";
import { Alert } from "@/components/ui/Alert";
import {
  setClipCandidateStatusAction,
  updateClipCandidateAction,
} from "@/lib/clips/actions";
import { formatTimestamp } from "@/lib/clips/mock";
import type { ClipCandidate, ClipCandidateStatus } from "@/types/database";

type ClipCandidatesReviewProps = {
  clips: ClipCandidate[];
  projectId: string;
  sourceFileId: string;
  signedVideoUrl: string | null;
  durationSeconds: number | null;
  approvedCount?: number;
};

type Draft = {
  title: string;
  reason: string;
  startTime: string;
  endTime: string;
};

const STATUS_STYLES: Record<ClipCandidateStatus, string> = {
  suggested: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  approved: "bg-teal-50 text-teal-900",
  rejected: "bg-red-50 text-red-800",
  exported: "bg-sky-50 text-sky-900",
};

export function ClipCandidatesReview({
  clips,
  projectId,
  sourceFileId,
  signedVideoUrl,
  durationSeconds,
  approvedCount = 0,
}: ClipCandidatesReviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [filter, setFilter] = useState<"all" | ClipCandidateStatus>("all");
  const [activeId, setActiveId] = useState<string | null>(clips[0]?.id ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      clips.map((clip) => [
        clip.id,
        {
          title: clip.title,
          reason: clip.reason,
          startTime: String(Number(clip.start_time)),
          endTime: String(Number(clip.end_time)),
        },
      ]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return clips;
    return clips.filter((clip) => clip.status === filter);
  }, [clips, filter]);

  const counts = useMemo(() => {
    return {
      all: clips.length,
      suggested: clips.filter((c) => c.status === "suggested").length,
      approved: clips.filter((c) => c.status === "approved").length,
      rejected: clips.filter((c) => c.status === "rejected").length,
      exported: clips.filter((c) => c.status === "exported").length,
    };
  }, [clips]);

  function jumpTo(time: number, clipId: string) {
    setActiveId(clipId);
    setCurrentTime(time);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    void video.play().catch(() => {
      // Seeking still works if autoplay is blocked.
    });
  }

  function saveClip(clipId: string) {
    const draft = drafts[clipId];
    if (!draft) return;
    setMessage(null);
    setError(null);
    setBusyId(clipId);
    startTransition(async () => {
      const result = await updateClipCandidateAction({
        clipId,
        projectId,
        sourceFileId,
        title: draft.title,
        reason: draft.reason,
        startTime: Number(draft.startTime),
        endTime: Number(draft.endTime),
      });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
    });
  }

  function setStatus(
    clipId: string,
    status: Extract<ClipCandidateStatus, "suggested" | "approved" | "rejected">,
  ) {
    setMessage(null);
    setError(null);
    setBusyId(clipId);
    startTransition(async () => {
      const result = await setClipCandidateStatusAction({
        clipId,
        projectId,
        sourceFileId,
        status,
      });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
    });
  }

  if (clips.length === 0) {
    return (
      <Alert tone="info">
        No clip candidates yet. Run mock detection to suggest short-form windows
        for review.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface-card overflow-hidden">
          {signedVideoUrl ? (
            <video
              ref={videoRef}
              className="aspect-video w-full bg-black"
              src={signedVideoUrl}
              controls
              preload="metadata"
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime);
              }}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-900 px-6 text-center text-sm text-white/80">
              Secure video preview unavailable. You can still edit clip windows
              {durationSeconds
                ? ` (source duration ${formatTimestamp(durationSeconds)})`
                : ""}
              .
            </div>
          )}
          <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-muted">
            Current time: {formatTimestamp(currentTime)} · Click a candidate to
            jump
          </div>
        </section>

        <aside className="surface-card p-4">
          <p className="field-label">Filter</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["suggested", "Suggested"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
                ["exported", "Exported"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filter === value
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/80 text-muted ring-1 ring-[var(--border)]"
                }`}
                onClick={() => setFilter(value)}
              >
                {label} ({counts[value]})
              </button>
            ))}
          </div>
          <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto">
            {filtered.map((clip) => {
              const selected = activeId === clip.id;
              return (
                <li key={clip.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(Number(clip.start_time), clip.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-white"
                    }`}
                  >
                    <span className="block font-semibold">
                      {formatTimestamp(Number(clip.start_time))} –{" "}
                      {formatTimestamp(Number(clip.end_time))}
                    </span>
                    <span
                      className={`mt-1 line-clamp-2 block text-xs ${
                        selected ? "text-white/85" : "text-muted"
                      }`}
                    >
                      {drafts[clip.id]?.title || clip.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Review candidates
            </h2>
            <p className="mt-1 text-sm text-muted">
              Approve clips, then export with FFmpeg to private storage. Re-running
              detection replaces suggested and rejected items only.
            </p>
          </div>
          {approvedCount > 0 ? (
            <ExportClipButton
              mode="approved"
              sourceFileId={sourceFileId}
              label={`Export ${approvedCount} approved`}
            />
          ) : null}
        </div>
        {filtered.map((clip) => {
          const draft = drafts[clip.id] ?? {
            title: clip.title,
            reason: clip.reason,
            startTime: String(Number(clip.start_time)),
            endTime: String(Number(clip.end_time)),
          };
          const busy = pending && busyId === clip.id;
          const locked = clip.status === "exported";

          return (
            <article key={clip.id} className="surface-card space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-accent hover:underline"
                  onClick={() => jumpTo(Number(draft.startTime) || Number(clip.start_time), clip.id)}
                >
                  Preview {formatTimestamp(Number(draft.startTime) || Number(clip.start_time))}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[clip.status]}`}
                  >
                    {clip.status}
                  </span>
                  {clip.score != null ? (
                    <span className="text-xs text-muted">
                      Score {Math.round(Number(clip.score) * 100)}%
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor={`title-${clip.id}`} className="field-label">
                  Title
                </label>
                <input
                  id={`title-${clip.id}`}
                  className="field-input"
                  disabled={locked || busy}
                  value={draft.title}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [clip.id]: { ...draft, title: event.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor={`reason-${clip.id}`} className="field-label">
                  Why this clip
                </label>
                <textarea
                  id={`reason-${clip.id}`}
                  className="field-input min-h-20"
                  disabled={locked || busy}
                  value={draft.reason}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [clip.id]: { ...draft, reason: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`start-${clip.id}`} className="field-label">
                    Start (seconds)
                  </label>
                  <input
                    id={`start-${clip.id}`}
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={locked || busy}
                    value={draft.startTime}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [clip.id]: { ...draft, startTime: event.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`end-${clip.id}`} className="field-label">
                    End (seconds)
                  </label>
                  <input
                    id={`end-${clip.id}`}
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={locked || busy}
                    value={draft.endTime}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [clip.id]: { ...draft, endTime: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={locked || busy}
                  onClick={() => saveClip(clip.id)}
                >
                  {busy ? "Saving…" : "Save edits"}
                </button>
                {clip.status !== "approved" && clip.status !== "exported" ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busy}
                    onClick={() => setStatus(clip.id, "approved")}
                  >
                    Approve
                  </button>
                ) : null}
                {clip.status === "approved" || clip.status === "exported" ? (
                  <ExportClipButton
                    mode="one"
                    clipCandidateId={clip.id}
                    label={
                      clip.status === "exported"
                        ? "Re-export with FFmpeg"
                        : "Export with FFmpeg"
                    }
                  />
                ) : null}
                {clip.status !== "rejected" ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    onClick={() => setStatus(clip.id, "rejected")}
                  >
                    Reject
                  </button>
                ) : null}
                {clip.status !== "suggested" ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => setStatus(clip.id, "suggested")}
                  >
                    Mark suggested
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
