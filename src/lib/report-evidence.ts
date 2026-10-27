import type { TranscriptTurn } from "./interview-metrics";
import type { InterviewReport } from "./interview-report";
import { countFillers } from "./interview-prompt";
import { questionTiming } from "./performance";

export function reportCommunication(turns: TranscriptTurn[]) {
  const counts: Record<string, number> = {};
  const points = turns.filter((t) => t.role === "user" && t.text.trim()).map((t) => {
    const fillers = countFillers(t.text);
    for (const [word, n] of Object.entries(fillers.counts)) counts[word] = (counts[word] ?? 0) + n;
    const words = t.text.trim().split(/\s+/).length;
    const duration = t.end_ms - t.start_ms;
    return { timestamp_s: Math.round(t.start_ms / 1000), text: t.text, words, fillers: fillers.total, counts: fillers.counts, pace: duration > 0 ? Math.round(words * 60000 / duration) : null };
  });
  return { points, counts, total: points.reduce((sum, p) => sum + p.fillers, 0) };
}

export function answerEvidence(q: InterviewReport["questions"][number], turns: TranscriptTurn[]) {
  const timing = questionTiming(turns).find((t) => t.question.trim() === q.question.trim());
  // Only map full answers through an exact question match, never array index or guessed proximity.
  return { answer: timing?.answer || null, duration_s: timing?.duration_s ?? null, response_latency_s: timing?.response_latency_s ?? null };
}

export function reportMoments(report: InterviewReport) {
  return [...(report.measured_moments ?? []).map((m) => ({ ...m, source: "Caption measurement" })), ...(report.content_moments ?? []).map((m) => ({ ...m, source: "AI transcript evaluation" }))].sort((a,b) => a.timestamp_s - b.timestamp_s);
}

export const PANEL_CRITERIA: Record<string, string> = {
  communication: "A panel looks for clear, direct explanations, appropriate vocabulary and a coherent conclusion—not accent or personality.",
  answer_quality: "A panel evaluates whether you answer the actual question with relevant examples and supported claims.",
  subject_knowledge: "A panel may probe your understanding of concepts, current affairs and the limits of your factual claims.",
  structured_thinking: "A panel looks for an organised argument, stated assumptions and a logical link between evidence and conclusions.",
  etiquette: "A panel evaluates respectful responses, listening and professional turn-taking—not appearance or background.",
  presentation: "Camera framing and observable posture can support presentation coaching, but do not establish ability or internal confidence.",
};