"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { updateCaptionCueAction } from "@/lib/captions/actions";
import { buildWebVtt } from "@/lib/captions/format";
import type { CaptionWithCues } from "@/lib/captions/queries";
import { formatTimestamp } from "@/lib/transcripts/mock";

type CaptionEditorProps = {
  caption: CaptionWithCues;
  projectId: string;
  sourceFileId: string;
  signedVideoUrl: string | null;
  durationSeconds: number | null;
};

type Draft = {
  text: string;
  startTime: string;
  endTime: string;
};

export function CaptionEditor({
  caption,
  projectId,
  sourceFileId,
  signedVideoUrl,
  durationSeconds,
}: CaptionEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    caption.cues[0]?.id ?? null,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      caption.cues.map((cue) => [
        cue.id,
        {
          text: cue.text,
          startTime: String(Number(cue.start_time)),
          endTime: String(Number(cue.end_time)),
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
    if (!normalized) return caption.cues;
    return caption.cues.filter((cue) => {
      const draft = drafts[cue.id];
      return (
        draft?.text.toLowerCase().includes(normalized) ||
        cue.text.toLowerCase().includes(normalized)
      );
    });
  }, [caption.cues, drafts, query]);

  const timedActiveId = useMemo(() => {
    const active = caption.cues.find(
      (cue) =>
        currentTime >= Number(cue.start_time) &&
        currentTime < Number(cue.end_time),
    );
    return active?.id ?? null;
  }, [caption.cues, currentTime]);

  const activeId = timedActiveId ?? selectedId;

  const vttContent = useMemo(() => {
    const cues = caption.cues.map((cue) => {
      const draft = drafts[cue.id];
      return {
        startTime: Number(draft?.startTime ?? cue.start_time),
        endTime: Number(draft?.endTime ?? cue.end_time),
        text: draft?.text ?? cue.text,
      };
    });
    return buildWebVtt(cues);
  }, [caption.cues, drafts]);

  const trackUrl = useMemo(
    () => URL.createObjectURL(new Blob([vttContent], { type: "text/vtt" })),
    [vttContent],
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(trackUrl);
    };
  }, [trackUrl]);

  function jumpTo(time: number, cueId: string) {
    setSelectedId(cueId);
    setCurrentTime(time);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    void video.play().catch(() => {
      // Seeking still works if autoplay is blocked.
    });
  }

  function saveCue(cueId: string) {
    const draft = drafts[cueId];
    if (!draft) return;
    setMessage(null);
    setError(null);
    setSavingId(cueId);
    startTransition(async () => {
      const result = await updateCaptionCueAction({
        cueId,
        projectId,
        sourceFileId,
        text: draft.text,
        startTime: Number(draft.startTime),
        endTime: Number(draft.endTime),
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
            >
              <track
                key={trackUrl}
                kind="captions"
                srcLang={caption.language || "en"}
                label="Captions"
                src={trackUrl}
                default
              />
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-900 px-6 text-center text-sm text-white/80">
              Secure video preview unavailable. You can still edit caption cues
              {durationSeconds
                ? ` (duration ${formatTimestamp(durationSeconds)})`
                : ""}
              .
            </div>
          )}
          <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-muted">
            Current time: {formatTimestamp(currentTime)} · Click a cue to jump ·
            captions overlay when the browser supports WebVTT tracks
          </div>
        </section>

        <aside className="surface-card p-4">
          <label htmlFor="caption-search" className="field-label">
            Search cues
          </label>
          <input
            id="caption-search"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search caption text"
          />
          <p className="mt-3 text-xs text-muted">
            {caption.cues.length} cues · language {caption.language}
          </p>
          <ul className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto">
            {filtered.map((cue) => {
              const selected = activeId === cue.id;
              return (
                <li key={cue.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(Number(cue.start_time), cue.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-white"
                    }`}
                  >
                    <span className="block font-semibold">
                      {formatTimestamp(Number(cue.start_time))} –{" "}
                      {formatTimestamp(Number(cue.end_time))}
                    </span>
                    <span
                      className={`mt-1 line-clamp-2 block text-xs ${
                        selected ? "text-white/85" : "text-muted"
                      }`}
                    >
                      {drafts[cue.id]?.text || cue.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Edit caption cues</h2>
        {filtered.map((cue) => {
          const draft = drafts[cue.id] ?? {
            text: cue.text,
            startTime: String(Number(cue.start_time)),
            endTime: String(Number(cue.end_time)),
          };
          const saving = pending && savingId === cue.id;
          return (
            <article key={cue.id} className="surface-card space-y-3 px-5 py-4">
              <button
                type="button"
                className="text-sm font-semibold text-accent hover:underline"
                onClick={() =>
                  jumpTo(Number(draft.startTime) || Number(cue.start_time), cue.id)
                }
              >
                Preview {formatTimestamp(Number(draft.startTime) || Number(cue.start_time))}
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`start-${cue.id}`} className="field-label">
                    Start (seconds)
                  </label>
                  <input
                    id={`start-${cue.id}`}
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={draft.startTime}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [cue.id]: { ...draft, startTime: event.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`end-${cue.id}`} className="field-label">
                    End (seconds)
                  </label>
                  <input
                    id={`end-${cue.id}`}
                    className="field-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={draft.endTime}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [cue.id]: { ...draft, endTime: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`text-${cue.id}`} className="field-label">
                  Caption text
                </label>
                <textarea
                  id={`text-${cue.id}`}
                  className="field-input min-h-20"
                  value={draft.text}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [cue.id]: { ...draft, text: event.target.value },
                    }))
                  }
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => saveCue(cue.id)}
              >
                {saving ? "Saving…" : "Save cue"}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
