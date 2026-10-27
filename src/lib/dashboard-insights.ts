// Browser-safe, deterministic helpers for the student dashboard.
import type { InterviewReport, MeasuredMoment } from "./interview-report";
import type { TranscriptTurn } from "./interview-metrics";
import { countFillers } from "./interview-prompt";

export const SECTIONS = [
  { key: "resume", label: "Resume-based" },
  { key: "practical", label: "Case-based" },
  { key: "general_knowledge", label: "College intelligence" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

export const LONG_PAUSE_S = 5;
export const FAST_WPM = 180;
export const FILLER_FLAG = 3;

export function categoryScores(questions: Array<{ section?: string; score: number }>) {
  const out = { resume: null, practical: null, general_knowledge: null } as Record<SectionKey, number | null>;
  for (const { key } of SECTIONS) {
    const s = questions.filter((q) => q.section === key).map((q) => q.score);
    out[key] = s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
  }
  return out;
}

export function strongestWeakest(scores: Record<string, number | null>) {
  const entries = SECTIONS.map((s) => ({ ...s, score: scores[s.key] })).filter((e): e is typeof e & { score: number } => e.score != null);
  if (entries.length < 2) return { strongest: null, weakest: null };
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  if (sorted[0].score === sorted[sorted.length - 1].score) return { strongest: null, weakest: null };
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

/** Only genuine, measurable timing/word events from caption timing. */
export function measuredMoments(turns: TranscriptTurn[]): MeasuredMoment[] {
  const moments: MeasuredMoment[] = [];
  let lastQuestion = "";
  let lastAssistantEnd: number | null = null;
  for (const t of turns) {
    if (t.role === "assistant") { lastQuestion = t.text; lastAssistantEnd = t.end_ms; continue; }
    const ts = Math.round(t.start_ms / 1000);
    const excerpt = t.text.length > 180 ? `${t.text.slice(0, 180)}…` : t.text;
    const base = { timestamp_s: ts, question: lastQuestion, excerpt };
    if (lastAssistantEnd != null) {
      const gap = (t.start_ms - lastAssistantEnd) / 1000;
      if (gap >= LONG_PAUSE_S) moments.push({ ...base, kind: "pause", issue: `You paused for about ${Math.round(gap)} seconds before answering.`, correction: "Pause briefly to organise your thoughts, then start with a one-line headline answer." });
    }
    const words = t.text.trim().split(/\s+/).filter(Boolean).length;
    const mins = (t.end_ms - t.start_ms) / 60000;
    if (words >= 20 && mins > 0 && words / mins > FAST_WPM) moments.push({ ...base, kind: "pace", issue: `Your speaking speed was about ${Math.round(words / mins)} words per minute, above the recommended range.`, correction: "Reduce speaking speed and explain one point at a time." });
    const fillers = countFillers(t.text).total;
    if (fillers >= FILLER_FLAG) moments.push({ ...base, kind: "filler", issue: `You used ${fillers} possible filler words in this answer.`, correction: "Replace fillers with a short silent pause. If you lose your train of thought, summarise what you have said and continue." });
    lastAssistantEnd = null;
  }
  return moments;
}

export function scoreDelta(latest: number | null | undefined, previous: number | null | undefined) {
  return latest == null || previous == null ? null : latest - previous;
}

export type ScoredInterview = { id: string; started_at: string; overall_score: number | null; report: InterviewReport | null };

export function journey(interviews: ScoredInterview[]) {
  return interviews
    .filter((i) => i.overall_score != null && i.report)
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
}

export function compareLatest(chronological: ScoredInterview[]) {
  const latest = chronological.at(-1);
  const previous = chronological.at(-2);
  if (!latest) return null;
  const ls = latest.report?.category_scores; const ps = previous?.report?.category_scores;
  const changes = previous && ls && ps ? SECTIONS.map((s) => ({ ...s, delta: scoreDelta(ls[s.key], ps[s.key]) })).filter((c): c is typeof c & { delta: number } => c.delta != null) : [];
  const sorted = [...changes].sort((a, b) => b.delta - a.delta);
  return {
    latest, previous: previous ?? null,
    delta: scoreDelta(latest.overall_score, previous?.overall_score),
    improved: sorted[0] && sorted[0].delta > 0 ? sorted[0] : null,
    attention: sorted.at(-1) && sorted.at(-1)!.delta < 0 ? sorted.at(-1)! : null,
  };
}

export function topPriorities(report: InterviewReport | null | undefined) {
  if (!report) return [];
  return (report.improvement_areas ?? []).slice(0, 3).map((area, i) => ({ area, exercise: report.improvement_plan?.[i]?.detail ?? "" }));
}

export type ReviewItem = { key: string; interviewId: string; index: number; date: string; q: InterviewReport["questions"][number] };
export function reviewItems(interviews: ScoredInterview[]): ReviewItem[] {
  return journey(interviews).reverse().flatMap((i) => (i.report?.questions ?? []).map((q, index) => ({ key: `${i.id}:${index}`, interviewId: i.id, index, date: i.started_at, q })));
}

export function splitReviews(items: ReviewItem[], reviewed: Set<string>) {
  return { pending: items.filter((i) => !reviewed.has(i.key)), done: items.filter((i) => reviewed.has(i.key)) };
}

export function weakestArea(report: InterviewReport | null | undefined) {
  if (!report) return null;
  const s = report.scores;
  const list = [["Communication", s.communication.score], ["Answer quality", s.answer_quality.score], ["Subject knowledge", s.subject_knowledge.score], ["Structured thinking", s.structured_thinking.score]] as const;
  return [...list].sort((a, b) => a[1] - b[1])[0][0];
}

export type Status = "Good" | "Needs Improvement" | "Not Enough Data";
export function pctStatus(v: number | null | undefined, good = 70): Status {
  return v == null ? "Not Enough Data" : v >= good ? "Good" : "Needs Improvement";
}
export function fmtTime(s: number) {
  const m = Math.floor(s / 60); return `${String(m).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}
