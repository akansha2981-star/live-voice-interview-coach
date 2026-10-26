export type TranscriptTurn = { role: "user" | "assistant"; text: string; start_ms: number; end_ms: number };

export function transcriptMetrics(turns: TranscriptTurn[]) {
  const answers = turns.filter((t) => t.role === "user" && t.text.trim());
  const words = answers.reduce((n, t) => n + t.text.trim().split(/\s+/).length, 0);
  const speakingMs = answers.reduce((n, t) => n + Math.max(0, t.end_ms - t.start_ms), 0);
  return {
    words,
    answers: answers.length,
    interviewerTurns: turns.filter((t) => t.role === "assistant" && t.text.trim()).length,
    averageWords: answers.length ? Math.round(words / answers.length) : 0,
    pace: speakingMs > 0 ? Math.round(words * 60000 / speakingMs) : null,
  };
}