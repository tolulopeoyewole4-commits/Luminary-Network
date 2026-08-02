"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "TEXT_TO_VIDEO" | "SCRIPT_TO_FILM";

const PLACEHOLDERS: Record<Mode, string> = {
  TEXT_TO_VIDEO:
    "Describe your video. e.g. A calm morning by the ocean. The sun rises slowly. Waves roll onto the shore. A new day begins.",
  SCRIPT_TO_FILM:
    "Paste your script. Separate scenes with blank lines or INT./EXT. headings and each becomes a segment of the film.",
};

export function CreateVideoForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("TEXT_TO_VIDEO");
  const [sourceText, setSourceText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, mode, sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate video");
      router.push(`/videos/${data.video.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["TEXT_TO_VIDEO", "SCRIPT_TO_FILM"] as Mode[]).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              mode === m
                ? "border-fuchsia-400/60 bg-fuchsia-400/10 text-white"
                : "border-white/15 bg-black/20 text-white/60 hover:border-white/30"
            }`}
          >
            {m === "TEXT_TO_VIDEO" ? "Text → Video" : "Script → Film"}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={160}
          placeholder="Untitled video"
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-fuchsia-400/60"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">
          {mode === "SCRIPT_TO_FILM" ? "Script" : "Prompt / text"}
        </label>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          required
          rows={7}
          placeholder={PLACEHOLDERS[mode]}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-fuchsia-400/60"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Rendering video…" : "Generate video"}
      </button>
      {submitting && (
        <p className="text-center text-xs text-white/50">
          Building storyboard and rendering with ffmpeg — this can take a few
          seconds.
        </p>
      )}
    </form>
  );
}
