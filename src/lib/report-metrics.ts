import type { InterviewReport } from "./interview.functions";
import type { VisionSummary } from "./vision";
import { PERFORMANCE_METRICS } from "./performance";

export type MetricObservation = { label: string; value: string; quality: string; detail: string };
export function reportObservations(report: InterviewReport, vision: VisionSummary | null, speech: Record<string, unknown> | null): MetricObservation[] {
  const audio = speech?.audio as { volume_variation?: number | null; clipping_pct?: number | null; pauses?: { t_s: number; duration_s: number }[] } | undefined;
  const percent = (v: number | null | undefined) => v == null ? "Unavailable" : `${v}%`;
  const observations: [string, string, string][] = [
    [percent(vision?.approx_eye_contact_pct), "Approximate", "Camera-relative gaze only; no psychological inference."],
    [vision?.blink_rate_per_min == null ? "Unavailable" : `${vision.blink_rate_per_min}/min`, "Low-rate estimate", "Requires at least 60 seconds. Fast blinks may be missed."],
    [vision ? `${vision.avg_abs_yaw_deg}° average yaw` : "Unavailable", "Approximate", "Head orientation, not attention or ability."],
    [percent(vision?.shoulders_level_pct), "Approximate", "Level shoulders only when reliably visible; not slouch detection."],
    [percent(vision?.face_visible_pct), "Measured samples", "Share of webcam observations with a detected face."],
    [percent(vision?.well_framed_pct), "Approximate", "Position and distance relative to camera."],
    ["Unavailable", "Not evaluated", "Visible wrists may be observed; gesture frequency/quality is not measured. No penalty."],
    [typeof speech?.words_per_minute === "number" && speech.words_per_minute > 0 ? `${speech.words_per_minute} wpm` : "Unavailable", "Timing estimate", "Derived from caption timing, not a linguistic fluency judgement."],
    [audio?.pauses ? `${audio.pauses.length} microphone silence gaps` : "Unavailable", "Audio-energy estimate", "Gaps of at least 3 seconds; may include listening to Aria."],
    [typeof speech?.filler_total === "number" ? `${speech.filler_total} possible fillers` : "Unavailable", "Transcript heuristic", "English words/phrases; context can change meaning. Other languages not measured."],
    [audio?.clipping_pct == null ? "Unavailable" : `${audio.clipping_pct}% clipping samples`, "Signal measurement", "Clipping only; intelligibility and background noise are not independently measured."],
    [audio?.volume_variation == null ? "Unavailable" : `${audio.volume_variation}% variation`, "Signal estimate", "Variation in active microphone energy; not a confidence score."],
    [`${report.scores.answer_quality.score}/100`, "AI transcript evaluation", report.scores.answer_quality.evidence],
    [`${report.scores.structured_thinking.score}/100`, "AI transcript evaluation", report.scores.structured_thinking.evidence],
    ["Included in communication feedback", "Not separately scored", report.scores.communication.evidence],
    [`${report.scores.subject_knowledge.score}/100`, "AI transcript evaluation", report.scores.subject_knowledge.evidence],
    [`${report.scores.structured_thinking.score}/100`, "Shared category score", "Reasoning shares the structured-thinking category; not a separate measurement."],
    ["Included in communication feedback", "Not psychological confidence", report.scores.communication.evidence],
    ["Included in question feedback", "Not separately scored", "See question-by-question evidence and follow-up responses."],
    [`${report.scores.etiquette.score}/100`, "AI transcript evaluation", report.scores.etiquette.evidence],
  ];
  return PERFORMANCE_METRICS.map((label, i) => ({ label, value: observations[i][0], quality: observations[i][1], detail: observations[i][2] }));
}