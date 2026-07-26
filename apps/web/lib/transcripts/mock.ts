export type MockTranscriptSegment = {
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
  confidence: number;
};

/**
 * Deterministic mock transcript used when no transcription API is configured.
 * Segments are spaced across the known video duration.
 */
export function buildMockTranscriptSegments(input: {
  durationSeconds: number;
  title?: string;
}): MockTranscriptSegment[] {
  const duration = Math.max(input.durationSeconds || 60, 15);
  const chunkSeconds = Math.min(12, Math.max(5, Math.floor(duration / 6)));
  const title = input.title?.replace(/\.[^.]+$/, "") || "this recording";

  const lines = [
    `Welcome. In this session we explore the key ideas from ${title}.`,
    "Let's begin by clarifying the main teaching point for today's audience.",
    "Notice how the first example reinforces the practical takeaway.",
    "Speaker note: pause here and invite reflection before continuing.",
    "The next section connects the idea to everyday application.",
    "Summarise the insight in one sentence your learners can remember.",
    "Close with a clear call to action tied to the source material.",
  ];

  const segments: MockTranscriptSegment[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < duration - 0.5) {
    const start = Number(cursor.toFixed(3));
    const end = Number(Math.min(duration, cursor + chunkSeconds).toFixed(3));
    const speaker = index % 4 === 3 ? "Speaker 2" : "Speaker 1";
    segments.push({
      startTime: start,
      endTime: end,
      speaker,
      text: lines[index % lines.length],
      confidence: 0.82 + ((index % 5) * 0.03),
    });
    cursor = end;
    index += 1;
    if (segments.length >= 40) break;
  }

  if (segments.length === 0) {
    segments.push({
      startTime: 0,
      endTime: Number(duration.toFixed(3)),
      speaker: "Speaker 1",
      text: `Transcript placeholder for ${title}.`,
      confidence: 0.8,
    });
  }

  return segments;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
