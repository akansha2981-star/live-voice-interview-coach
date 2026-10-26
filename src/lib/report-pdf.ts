import type { InterviewReport } from "./interview.functions";

const LABELS: Record<string, string> = {
  communication: "Communication & spoken English",
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

export async function downloadReportPdf(report: InterviewReport, meta: { name: string; date: string; type: string }) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.15, 0.27);
  const amber = rgb(0.85, 0.6, 0.15);
  const grey = rgb(0.4, 0.42, 0.5);
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

  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: ink });
  page.drawText("MBA Compass - AI Interview Report", { x: margin, y: 800, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText(ascii(`${meta.name} · ${meta.type} · ${meta.date}`).replace(/·/g, "|"), {
    x: margin,
    y: 778,
    size: 10,
    font,
    color: rgb(0.85, 0.85, 0.9),
  });
  page.drawText(`${report.overall_score}/100`, { x: 470, y: 785, size: 24, font: bold, color: amber });
  y = 715;
  text(report.readiness_level, 14, bold, amber);
  gap(4);
  text(report.summary, 10);
  gap(12);
  text("Scores", 13, bold);
  gap(2);
  for (const [k, v] of Object.entries(report.scores)) {
    text(`${LABELS[k] ?? k}: ${v.score}/100`, 10, bold);
    text(v.evidence, 9, font, grey, 12);
    gap(4);
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
  report.questions.forEach((q, i) => {
    gap(6);
    text(`Q${i + 1}. ${q.question}  (${q.score}/100)`, 10, bold);
    text(`Your answer: ${q.answer_summary}`, 9, font, ink, 10);
    if (q.quote) text(`At ${Math.floor(q.timestamp_s / 60)}:${String(q.timestamp_s % 60).padStart(2, "0")} - "${q.quote}"`, 9, font, grey, 10);
    text(`Evaluation: ${q.evaluation}`, 9, font, ink, 10);
    text(`Stronger answer: ${q.improved_answer}`, 9, font, grey, 10);
  });
  gap(12);
  text("Your improvement plan", 13, bold);
  report.improvement_plan.forEach((s, i) => {
    text(`${i + 1}. ${s.step} (${s.timeframe})`, 10, bold, ink, 4);
    text(s.detail, 9, font, grey, 16);
  });
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
