import type { TranscriptTurn } from "./interview-metrics";

export type AudioSample = { t: number; rms: number; peak: number; muted: boolean };
export type CoachingAlert = { key: string; text: string; t_s: number };
export const DEFAULT_COACHING = { cooldownSeconds: 30, fastWpm: 180, longAnswerWords: 180, lowVolume: 0.012 };
export const RUBRIC = { answer_quality: 30, structured_thinking: 20, communication: 20, delivery: 10, etiquette: 10, listening: 10 };
export function weightedScore(scores: Record<string, number | null>, weights = RUBRIC) {
  let sum = 0, total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key];
    if (typeof score !== "number" || !Number.isFinite(score)) continue;
    sum += Math.max(0, Math.min(100, score)) * weight;
    total += weight;
  }
  return total ? Math.round(sum / total) : null;
}
export function questionTiming(turns: TranscriptTurn[]) {
  return turns.flatMap((t, i) => {
    if (t.role !== "assistant" || !t.text.includes("?")) return [];
    const next = turns[i + 1];
    const answer = next?.role === "user" ? next : null;
    return [{ question: t.text, answer: answer?.text ?? "", timestamp_s: Math.round(t.start_ms / 1000), duration_s: answer && answer.end_ms > answer.start_ms ? Math.round((answer.end_ms - answer.start_ms) / 1000) : null, response_latency_s: answer && t.end_ms > 0 && answer.start_ms >= t.end_ms ? Math.round((answer.start_ms - t.end_ms) / 100) / 10 : null }];
  });
}
export function summarizeAudio(samples: AudioSample[], start: number) {
  const usable = samples.filter((s) => !s.muted);
  const active = usable.filter((s) => s.rms >= 0.012);
  const average = active.length ? active.reduce((n, s) => n + s.rms, 0) / active.length : null;
  const pauses: { t_s: number; duration_s: number }[] = [];
  let silence: number | null = null, heard = false;
  for (const s of samples) {
    if (s.muted) { silence = null; continue; }
    if (s.rms >= 0.012) {
      if (silence !== null && s.t - silence >= 3000) pauses.push({ t_s: Math.round((silence - start) / 1000), duration_s: Math.round((s.t - silence) / 100) / 10 });
      heard = true; silence = null;
    } else if (heard) silence ??= s.t;
  }
  return { samples: usable.length, average_rms: average, volume_variation: average ? Math.round(Math.sqrt(active.reduce((n, s) => n + (s.rms - average) ** 2, 0) / active.length) / average * 100) : null, clipping_pct: usable.length ? Math.round(usable.filter((s) => s.peak >= 0.98).length / usable.length * 1000) / 10 : null, pauses: pauses.slice(0, 200), timing_source: "browser audio energy; silence may include interviewer listening" };
}
export function shouldAlert(last: number | undefined, now: number, cooldownSeconds: number) {
  return last === undefined || now - last >= cooldownSeconds * 1000;
}
export const PERFORMANCE_METRICS = [
  "Eye gaze", "Blink frequency", "Head orientation", "Posture", "Face visibility", "Camera framing", "Hand gestures", "Speech pace", "Pauses", "Filler words", "Voice clarity / microphone", "Volume consistency", "Answer relevance", "Answer structure", "Grammar & vocabulary", "Subject knowledge", "Logical reasoning", "Communication decisiveness", "Listening & responsiveness", "Interview etiquette",
] as const;