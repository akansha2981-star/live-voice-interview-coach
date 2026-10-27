import type { InterviewReport } from "./interview-report";
import { answerEvidence, reportCommunication, reportMoments, PANEL_CRITERIA } from "./report-evidence";
import type { TranscriptTurn } from "./interview-metrics";
import { SECTIONS, categoryScores, fmtTime } from "./dashboard-insights";
import { reportObservations, type MetricObservation } from "./report-metrics";
import type { VisionSummary } from "./vision";

const LABELS: Record<string, string> = {
  communication: "Communication & spoken language",
  answer_quality: "Answer quality & relevance",
  subject_knowledge: "Subject knowledge",
  structured_thinking: "Structured thinking",
  presentation: "Professional presentation",
  etiquette: "Interview etiquette",
};
export const SCORE_LABELS = LABELS;

function ascii(s: string) {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\n]/g, "");
}

export type ReportExportContext = { history?: Array<{ started_at: string; overall_score: number | null }>; benchmark?: { sample_size: number; scope: string; avg_overall: number | null } | null };
export async function downloadReportPdf(report: InterviewReport, meta: { name: string; date: string; type: string; transcript?: Array<{ role: string; text: string; start_ms: number; end_ms?: number }>; vision?: VisionSummary | null; speech?: Record<string, unknown> | null } & ReportExportContext) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.15, 0.27);
  const amber = rgb(0.85, 0.6, 0.15);
  const grey = rgb(0.4, 0.42, 0.5);
  const light = rgb(0.96, 0.98, 1);
  const blue = rgb(0.02, 0.48, 0.76);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const margin = 50;
  const width = 595 - margin * 2;

  function ensure(h: number) {
    if (y - h < 50) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
  }
  function text(t: string, size = 10, f = font, color = ink, indent = 0) {
    const words = ascii(t).split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > width - indent) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      ensure(size + 4);
      page.drawText(l, { x: margin + indent, y, size, font: f, color });
      y -= size + 4;
    }
  }
  const gap = (n = 8) => (y -= n);

  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: light });
  page.drawText("MBA Compass - AI Interview Report", { x: margin, y: 800, size: 18, font: bold, color: blue });
  page.drawText(ascii(`${meta.name} · ${meta.type} · ${meta.date}`).replace(/·/g, "|"), {
    x: margin,
    y: 778,
    size: 10,
    font,
    color: grey,
  });
  page.drawText(`${report.overall_score}/100`, { x: 455, y: 755, size: 20, font: bold, color: blue });
  y = 715;
  text(report.readiness_level, 14, bold, amber);
  gap(4);
  text(report.summary, 10);
  gap(12);
  text("Scores", 13, bold);
  text("Overall rubric: answer quality 30%, reasoning 20%, communication 20%, speech delivery 10%, etiquette 10%, listening 10%. Missing categories are excluded and weights renormalised. Camera observations never determine ability score.", 9, font, grey);
  gap(2);
  for (const [k, v] of Object.entries(report.scores)) {
    text(`${LABELS[k] ?? k}: ${v.score}/100`, 10, bold);
    text(v.evidence, 9, font, grey, 12);
    text(`Panel criteria: ${PANEL_CRITERIA[k] ?? "Transcript-based evaluation"}`, 9, font, grey, 12);
    ensure(16);
    page.drawRectangle({ x: margin + 12, y: y - 5, width: 220, height: 5, color: light });
    page.drawRectangle({ x: margin + 12, y: y - 5, width: 220 * Math.max(0, Math.min(100, v.score)) / 100, height: 5, color: blue });
    gap(12);
    gap(4);
  }
  const sections = report.category_scores ?? categoryScores(report.questions);
  text("Section-wise scores", 13, bold);
  SECTIONS.forEach((s) => text(`${s.label}: ${sections[s.key] == null ? "Insufficient data" : `${sections[s.key]}/100`}`, 10));
  text("College readiness uses the college-intelligence section only and is not an admission prediction. Internal confidence is not measured.", 9, font, grey);
  if (report.assessment) {
    text(`Speech delivery: ${report.assessment.delivery.score ?? "Insufficient data"}. ${report.assessment.delivery.evidence}`, 9);
    text(`Listening: ${report.assessment.listening.score ?? "Insufficient data"}. ${report.assessment.listening.evidence}`, 9);
  }
  gap(8);
  text("Strengths", 13, bold);
  report.strengths.forEach((s) => text(`- ${s}`, 10, font, ink, 8));
  gap(8);
  text("Areas to improve", 13, bold);
  report.improvement_areas.forEach((s) => text(`- ${s}`, 10, font, ink, 8));
  gap(8);
  text("Presentation observations", 13, bold);
  report.presentation_notes.forEach((s) => text(`- ${s}`, 10, font, ink, 8));
  gap(12);
  text("Question-by-question evaluation", 13, bold);
  const turns: TranscriptTurn[] = (meta.transcript ?? []).map((t) => ({ ...t, role: t.role === "user" ? "user" : "assistant", end_ms: t.end_ms ?? t.start_ms }));
  report.questions.forEach((q, i) => {
    gap(6);
    text(`Q${i + 1}. ${q.question}  (${q.score}/100)`, 10, bold);
    text(`Your answer: ${q.answer_summary}`, 9, font, ink, 10);
    const evidence = answerEvidence(q, turns);
    if (evidence.answer) text(`Full candidate answer: ${evidence.answer}`, 9, font, ink, 10);
    text(`Section: ${SECTIONS.find((s) => s.key === q.section)?.label ?? "Follow-up"}. Answer duration: ${evidence.duration_s ?? "Insufficient data"}. Response gap: ${evidence.response_latency_s ?? "Insufficient data"}. Caption timing estimates.`, 9, font, grey, 10);
    text(`Relevance: ${q.relevance_score ?? "Insufficient data"}; accuracy: ${q.accuracy_score ?? "Insufficient data"}; reasoning: ${q.reasoning_score ?? "Insufficient data"}; communication: ${q.communication_score ?? "Insufficient data"}`, 9, font, grey, 10);
    if (q.went_well) text(`Strengths: ${q.went_well}`, 9, font, ink, 10);
    if (q.went_wrong) text(`Weaknesses: ${q.went_wrong}`, 9, font, ink, 10);
    if (q.recommendation) text(`Recommendation: ${q.recommendation}`, 9, font, ink, 10);
    if (q.quote) text(`At ${Math.floor(q.timestamp_s / 60)}:${String(q.timestamp_s % 60).padStart(2, "0")} - "${q.quote}"`, 9, font, grey, 10);
    text(`Evaluation: ${q.evaluation}`, 9, font, ink, 10);
    text(`Stronger answer: ${q.improved_answer}`, 9, font, grey, 10);
    if (q.sample_explanation) text(`Why it helps: ${q.sample_explanation}`, 9, font, grey, 10);
    if (q.missing_points?.length) text(`Missing points: ${q.missing_points.join("; ")}`, 9, font, ink, 10);
    if (q.unsupported_statements?.length) text(`Unsupported claims: ${q.unsupported_statements.join("; ")}`, 9, font, ink, 10);
    if (q.practice) text(`Practice: ${q.practice}`, 9, font, ink, 10);
  });
  gap(12);
  text("Your improvement plan", 13, bold);
  report.improvement_plan.forEach((s, i) => {
    text(`${i + 1}. ${s.step} (${s.timeframe})`, 10, bold, ink, 4);
    text(s.detail, 9, font, grey, 16);
  });
  gap(12);
  text("20 performance observations", 13, bold);
  const observations: MetricObservation[] = reportObservations(report, meta.vision ?? null, meta.speech ?? null);
  observations.forEach((m, i) => { text(`${i + 1}. ${m.label}: ${m.value}`, 10, bold); text(`${m.quality}. ${m.detail}`, 9, font, grey, 10); gap(4); });
  gap(12); text("Communication & filler analysis", 13, bold);
  const communication = reportCommunication(turns);
  text(`Possible English fillers: ${turns.length ? communication.total : "Insufficient data"}. Context may change meaning. Timestamps mark caption-turn starts, not exact words.`, 9);
  Object.entries(communication.counts).forEach(([w,n]) => text(`${w}: ${n}`, 9));
  communication.points.forEach((p) => { text(`${fmtTime(p.timestamp_s)} - ${p.words} words; pace ${p.pace ?? "Insufficient data"} wpm; possible fillers ${p.fillers}.`, 9); if (p.fillers) text(`Caption: ${p.text}`, 9, font, grey, 10); });
  const audio = meta.speech?.audio as { pauses?: Array<{t_s:number;duration_s:number}> } | undefined;
  audio?.pauses?.forEach((p) => text(`${fmtTime(p.t_s)}: ${p.duration_s}s microphone silence; may include listening.`, 9));
  gap(12); text("Performance timeline & timestamp-based feedback", 13, bold);
  report.questions.forEach((q,i) => text(`${fmtTime(q.timestamp_s)} - Q${i+1}: answer ${q.score}/100, communication ${q.communication_score ?? "Insufficient data"}.`, 9));
  reportMoments(report).forEach((m) => { text(`${fmtTime(m.timestamp_s)} - ${m.issue} (${m.source})`, 10, bold); text(`Question: ${m.question}. Response: ${m.excerpt}`, 9); text(`Better approach: ${m.correction}`, 9, font, grey); gap(4); });
  gap(12); text("Body language observation timeline", 13, bold);
  if (!meta.vision?.timeline?.length) text("Insufficient data for a camera timeline.", 9);
  meta.vision?.timeline?.forEach((p) => { text(`${fmtTime(p.t_s)} - approximate gaze ${p.eye}%, face visible ${p.face}%, framing ${p.framed}% (15-second observation group)`, 9); ensure(14); page.drawRectangle({x:margin,y:y-4,width:220,height:4,color:light}); page.drawRectangle({x:margin,y:y-4,width:220*Math.max(0,Math.min(100,p.eye))/100,height:4,color:blue}); gap(14); });
  text("Exact posture change moments, facial expressions, gesture quality and psychological confidence: Insufficient data. Shoulder-level posture is a session aggregate only.", 9, font, grey);
  gap(12); text("Peer benchmarking", 13, bold);
  text(meta.benchmark && meta.benchmark.avg_overall != null ? `${meta.benchmark.sample_size} other-candidate interviews. Peer average: ${Math.round(meta.benchmark.avg_overall)}. Your score: ${report.overall_score}.` : "No comparison data yet; the peer average appears once another candidate completes an interview.", 9);
  text("Percentile/rank: Insufficient data. Averages cannot establish a percentile. Duration and difficulty matching are not supplied.", 9, font, grey);
  gap(12); text("Session history & progress", 13, bold);
  meta.history?.forEach((h) => text(`${new Date(h.started_at).toLocaleString()} - ${h.overall_score ?? "Insufficient data"}/100`, 9));
  if (meta.transcript?.length) {
    gap(12); text("Complete transcript", 13, bold);
    meta.transcript.forEach((t) => { const seconds = Math.round(t.start_ms / 1000); text(`[${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}] ${t.role === "user" ? "Candidate" : "Aria"}: ${t.text}`, 9); gap(5); });
  }
  report.assessment?.limitations.forEach((s) => text(`Limitation: ${s}`, 9, font, grey));
  gap(12);
  text(
    "Webcam-based observations are approximate and describe observable presentation only. They do not assess honesty, personality, intelligence or emotions.",
    8,
    font,
    grey,
  );
  const bytes = await doc.save();
  saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), "interview-report.pdf");
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
