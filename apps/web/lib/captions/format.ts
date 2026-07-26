export type CaptionCueInput = {
  startTime: number;
  endTime: number;
  text: string;
};

/** WebVTT timestamp: HH:MM:SS.mmm */
export function formatVttTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hrs = Math.floor(totalMs / 3_600_000);
  const mins = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

/** SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTimestamp(seconds: number): string {
  return formatVttTimestamp(seconds).replace(".", ",");
}

export function buildWebVtt(cues: CaptionCueInput[]): string {
  const blocks = cues.map((cue, index) => {
    const text = cue.text.trim() || "…";
    return `${index + 1}\n${formatVttTimestamp(cue.startTime)} --> ${formatVttTimestamp(cue.endTime)}\n${text}`;
  });
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

export function buildSrt(cues: CaptionCueInput[]): string {
  const blocks = cues.map((cue, index) => {
    const text = cue.text.trim() || "…";
    return `${index + 1}\n${formatSrtTimestamp(cue.startTime)} --> ${formatSrtTimestamp(cue.endTime)}\n${text}`;
  });
  return `${blocks.join("\n\n")}\n`;
}

/**
 * Build caption cues from transcript segments, wrapping long lines for readability.
 */
export function buildCaptionCuesFromSegments(input: {
  segments: Array<{ startTime: number; endTime: number; text: string }>;
  maxCharsPerCue?: number;
}): CaptionCueInput[] {
  const maxChars = input.maxCharsPerCue ?? 84;
  const cues: CaptionCueInput[] = [];

  for (const segment of input.segments) {
    const text = segment.text.trim();
    if (!text) continue;

    if (text.length <= maxChars) {
      cues.push({
        startTime: Number(segment.startTime.toFixed(3)),
        endTime: Number(segment.endTime.toFixed(3)),
        text,
      });
      continue;
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);

    const duration = Math.max(0.5, segment.endTime - segment.startTime);
    const slice = duration / lines.length;
    lines.forEach((line, index) => {
      const start = Number((segment.startTime + slice * index).toFixed(3));
      const end = Number(
        Math.min(segment.endTime, start + slice).toFixed(3),
      );
      cues.push({
        startTime: start,
        endTime: Math.max(end, Number((start + 0.4).toFixed(3))),
        text: line,
      });
    });
  }

  return cues;
}
