import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { interviewQuery } from "@/lib/queries";
import { generateReport, type InterviewReport } from "@/lib/interview.functions";
import { INTERVIEW_CATEGORIES } from "@/lib/interview-prompt";
import { downloadReportPdf, saveBlob, SCORE_LABELS } from "@/lib/report-pdf";
import type { VisionSummary } from "@/lib/vision";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({
    meta: [
      { title: "Interview report — MBA Compass AI Interview" },
      { name: "description", content: "Your AI interview performance report." },
      { property: "og:title", content: "Interview report" },
      { property: "og:description", content: "Scores, evidence and an improvement plan." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(interviewQuery(params.id)),
  component: ReportPage,
});

type Turn = { role: string; text: string; start_ms: number };

function ReportPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateReport);
  const triggered = useRef(false);
  const [genError, setGenError] = useState<string | null>(null);
  const { data: interview } = useQuery({
    ...interviewQuery(id),
    refetchInterval: (q) => (["analyzing", "generating"].includes(q.state.data?.status ?? "") ? 4000 : false),
  });

  function run() {
    triggered.current = true;
    setGenError(null);
    generate({ data: { id } })
      .catch((e) => setGenError(e instanceof Error ? e.message : "Report generation failed"))
      .finally(() => queryClient.invalidateQueries({ queryKey: ["interview", id] }));
  }

  useEffect(() => {
    if (interview?.status === "analyzing" && !triggered.current) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview?.status]);

  if (!interview) return <p>Report not found.</p>;
  const transcript = (interview.transcript as Turn[]) ?? [];

  function downloadTranscript() {
    const body = transcript
      .map((t) => `[${fmt(t.start_ms / 1000)}] ${t.role === "user" ? "You" : "Aria"}: ${t.text}`)
      .join("\n\n");
    saveBlob(new Blob([body], { type: "text/plain" }), "interview-transcript.txt");
  }

  if (interview.status === "too_short") {
    return (
      <Notice title="This interview was too short to assess">
        We didn't capture enough of your answers to produce a fair report.
      </Notice>
    );
  }
  if (interview.status === "in_progress") {
    return (
      <Notice title="Interview still in progress">
        <Button asChild className="mt-4">
          <Link to="/interview/$id" params={{ id }}>
            Return to interview room
          </Link>
        </Button>
      </Notice>
    );
  }
  if (interview.status === "failed" || genError) {
    return (
      <Notice title="We couldn't finish your report">
        <p>{genError ?? interview.error}</p>
        <Button className="mt-4" onClick={run}>
          Try again
        </Button>
      </Notice>
    );
  }
  if (!interview.report) {
    return (
      <Notice title="Analysing your interview…">
        <div className="mx-auto mt-4 size-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4">This usually takes about a minute. You can leave this page and come back.</p>
      </Notice>
    );
  }

  const report = interview.report as unknown as InterviewReport;
  const vision = interview.vision_summary as unknown as VisionSummary | null;
  const speech = interview.speech_metrics as Record<string, number> | null;
  const type = INTERVIEW_CATEGORIES[interview.category ?? ""] ?? "Interview";
  const date = new Date(interview.started_at).toLocaleDateString();

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 rounded-2xl bg-gradient-ink p-8 text-ink-foreground md:grid-cols-[auto_1fr]">
        <div className="animate-rise text-accent">
          <ScoreRing value={report.overall_score} size={150} stroke={12} label="out of 100" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent">{report.readiness_level}</p>
          <h1 className="mt-1 text-3xl font-semibold">{type}</h1>
          <p className="text-sm text-ink-muted">
            {date} · {interview.difficulty} · {Math.round((interview.duration_s ?? 0) / 60)} min
          </p>
          <p className="mt-4 max-w-2xl text-ink-foreground/90">{report.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => downloadReportPdf(report, { name: "Candidate", date, type })}
            >
              Download PDF report
            </Button>
            <Button variant="secondary" onClick={downloadTranscript}>
              Download transcript
            </Button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(report.scores).map(([k, v], i) => (
          <div key={k} style={{ animationDelay: `${i * 70}ms` }} className="animate-rise rounded-2xl border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">{SCORE_LABELS[k] ?? k}</p>
              <p className="font-display text-2xl font-bold"><AnimatedNumber value={v.score} /></p>
            </div>
            <GrowBar value={v.score} className="mt-2" />
            <p className="mt-3 text-sm text-muted-foreground">{v.evidence}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ListCard title="Strengths" items={report.strengths} />
        <ListCard title="Areas to improve" items={report.improvement_areas} />
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Delivery & presentation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {speech && <Metric label="Speaking pace" value={`${speech.words_per_minute ?? 0} wpm`} />}
          {speech && <Metric label="Filler words" value={`${speech.filler_per_100_words ?? 0} / 100 words`} />}
          {vision && <Metric label="Face visible" value={`${vision.face_visible_pct}%`} />}
          {vision && <Metric label="Approx. eye contact" value={`${vision.approx_eye_contact_pct}%`} />}
          {vision && <Metric label="Well framed" value={`${vision.well_framed_pct}%`} />}
          {vision?.shoulders_level_pct != null && <Metric label="Upright posture" value={`${vision.shoulders_level_pct}%`} />}
          {vision && <Metric label="Low light" value={`${vision.low_light_pct}%`} />}
          {speech && <Metric label="Avg. answer length" value={`${speech.avg_answer_words ?? 0} words`} />}
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          {report.presentation_notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Webcam observations are approximate and describe observable presentation only — never honesty, personality or emotions.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Question by question</h2>
        <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
          {report.questions.map((q, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="text-left">
                <span className="flex-1">
                  Q{i + 1}. {q.question}
                </span>
                <span className="mr-3 font-display text-xl">{q.score}</span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 text-sm">
                <p>
                  <span className="font-semibold">Your answer: </span>
                  {q.answer_summary}
                </p>
                {q.quote && (
                  <blockquote className="border-l-2 border-accent pl-3 text-muted-foreground">
                    <span className="mr-2 font-mono text-xs">{fmt(q.timestamp_s)}</span>“{q.quote}”
                  </blockquote>
                )}
                <p>
                  <span className="font-semibold">Evaluation: </span>
                  {q.evaluation}
                </p>
                <div className="rounded-lg bg-muted p-3">
                  <p className="mb-1 font-semibold">A stronger answer</p>
                  <p>{q.improved_answer}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Your improvement plan</h2>
        <ol className="mt-4 grid gap-4">
          {report.improvement_plan.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">
                  {s.step} <span className="text-xs font-normal text-muted-foreground">· {s.timeframe}</span>
                </p>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Transcript</h2>
        <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border bg-card p-4">
          {transcript.map((t, i) => (
            <p key={i} className="text-sm">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{fmt(t.start_ms / 1000)}</span>
              <span className="font-semibold">{t.role === "user" ? "You" : "Aria"}: </span>
              {t.text}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function fmt(s: number) {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">{title}</h1>
      {children}
      <div className="mt-6">
        <Link to="/dashboard" className="font-semibold text-foreground hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
