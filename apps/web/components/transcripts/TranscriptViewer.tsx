"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { updateTranscriptSegmentAction } from "@/lib/transcripts/actions";
import { formatTimestamp } from "@/lib/transcripts/mock";
import type { TranscriptWithSegments } from "@/lib/transcripts/queries";

type TranscriptViewerProps = {
  transcript: TranscriptWithSegments;
  projectId: string;
  sourceFileId: string;
  signedVideoUrl: string | null;
  durationSeconds: number | null;
};

export function TranscriptViewer({
  transcript,
  projectId,
  sourceFileId,
  signedVideoUrl,
  durationSeconds,
}: TranscriptViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    transcript.segments[0]?.id ?? null,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [drafts, setDrafts] = useState<
    Record<string, { text: string; speaker: string }>
  >(() =>
    Object.fromEntries(
      transcript.segments.map((segment) => [
        segment.id,
        {
          text: segment.text,
          speaker: segment.speaker || "Speaker 1",
        },
      ]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return transcript.segments;
    return transcript.segments.filter((segment) => {
      const draft = drafts[segment.id];
      return (
        draft?.text.toLowerCase().includes(normalized) ||
        draft?.speaker.toLowerCase().includes(normalized) ||
        segment.text.toLowerCase().includes(normalized)
      );
    });
  }, [drafts, query, transcript.segments]);

  const timedActiveId = useMemo(() => {
    const active = transcript.segments.find(
      (segment) =>
        currentTime >= Number(segment.start_time) &&
        currentTime < Number(segment.end_time),
    );
    return active?.id ?? null;
  }, [currentTime, transcript.segments]);

  const activeId = timedActiveId ?? selectedId;

  function jumpTo(time: number, segmentId: string) {
    setSelectedId(segmentId);
    setCurrentTime(time);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    void video.play().catch(() => {
      // Autoplay can be blocked; seeking still works.
    });
  }

  function saveSegment(segmentId: string) {
    const draft = drafts[segmentId];
    if (!draft) return;
    setMessage(null);
    setError(null);
    setSavingId(segmentId);
    startTransition(async () => {
      const result = await updateTranscriptSegmentAction({
        segmentId,
        text: draft.text,
        speaker: draft.speaker,
        projectId,
        sourceFileId,
      });
      setSavingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
              Secure video preview unavailable. You can still edit and navigate
              transcript timestamps
              {durationSeconds ? ` (duration ${formatTimestamp(durationSeconds)})` : ""}.
            </div>
          )}
          <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-muted">
            Current time: {formatTimestamp(currentTime)} · Click a segment to
            jump
          </div>
        </section>

        <aside className="surface-card p-4">
          <label htmlFor="transcript-search" className="field-label">
            Search transcript
          </label>
          <input
            id="transcript-search"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search text or speaker"
          />
          <p className="mt-3 text-xs text-muted">
            Mock transcript · {transcript.segments.length} segments · language{" "}
            {transcript.language}
          </p>
          <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto">
            {filtered.map((segment) => {
              const selected = activeId === segment.id;
              return (
                <li key={segment.id}>
                  <button
                    type="button"
                    onClick={() =>
                      jumpTo(Number(segment.start_time), segment.id)
                    }
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-white"
                    }`}
                  >
                    <span className="block font-semibold">
                      {formatTimestamp(Number(segment.start_time))} ·{" "}
                      {drafts[segment.id]?.speaker || "Speaker"}
                    </span>
                    <span
                      className={`mt-1 line-clamp-2 block text-xs ${
                        selected ? "text-white/85" : "text-muted"
                      }`}
                    >
                      {drafts[segment.id]?.text || segment.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Edit segments</h2>
        {filtered.map((segment) => {
          const draft = drafts[segment.id] ?? {
            text: segment.text,
            speaker: segment.speaker || "Speaker 1",
          };
          const saving = pending && savingId === segment.id;
          return (
            <article key={segment.id} className="surface-card space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-accent hover:underline"
                  onClick={() => jumpTo(Number(segment.start_time), segment.id)}
                >
                  {formatTimestamp(Number(segment.start_time))} –{" "}
                  {formatTimestamp(Number(segment.end_time))}
                </button>
                <span className="text-xs text-muted">
                  Confidence:{" "}
                  {segment.confidence != null
                    ? `${Math.round(Number(segment.confidence) * 100)}%`
                    : "n/a"}
                </span>
              </div>
              <div>
                <label
                  htmlFor={`speaker-${segment.id}`}
                  className="field-label"
                >
                  Speaker label
                </label>
                <input
                  id={`speaker-${segment.id}`}
                  className="field-input"
                  value={draft.speaker}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [segment.id]: {
                        ...draft,
                        speaker: event.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label htmlFor={`text-${segment.id}`} className="field-label">
                  Transcript text
                </label>
                <textarea
                  id={`text-${segment.id}`}
                  className="field-input min-h-24"
                  value={draft.text}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [segment.id]: {
                        ...draft,
                        text: event.target.value,
                      },
                    }))
                  }
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => saveSegment(segment.id)}
              >
                {saving ? "Saving…" : "Save segment"}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
