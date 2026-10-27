import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { interviewQuery } from "@/lib/queries";
import { generateReport, type InterviewReport } from "@/lib/interview.functions";
import { INTERVIEW_CATEGORIES } from "@/lib/interview-prompt";
import { downloadReportPdf, saveBlob, type ReportExportContext } from "@/lib/report-pdf";
import type { VisionSummary } from "@/lib/vision";
import { Button } from "@/components/ui/button";
import { InterviewReportWorkspace } from "@/components/interview-report-workspace";
import { toast } from "sonner";
import type { TranscriptTurn } from "@/lib/interview-metrics";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({
    meta: [
      { title: "Interview report — MBA Compass AI Interview" },
      { name: "description", content: "Your AI interview performance report." },
      { property: "og:title", content: "Interview report — MBA Compass" },
      { property: "og:description", content: "Scores, evidence and an improvement plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(interviewQuery(params.id)),
  component: ReportPage,
});

type Turn = { role: string; text: string; start_ms: number };

function ReportPage() {
  const { id } = Route.useParams();
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const generate = useServerFn(generateReport);
  const triggered = useRef(false);
  const [pdfBusy, setPdfBusy] = useState(false);
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
  const speech = interview.speech_metrics as Record<string, unknown> | null;
  const type = INTERVIEW_CATEGORIES[interview.category ?? ""] ?? "Interview";
  const date = new Date(interview.started_at).toLocaleDateString();
  const turns: TranscriptTurn[] = transcript.map((t) => ({ role: t.role === "user" ? "user" : "assistant", text: t.text, start_ms: t.start_ms, end_ms: typeof (t as Partial<TranscriptTurn>).end_ms === "number" ? Number((t as Partial<TranscriptTurn>).end_ms) : t.start_ms }));
  async function exportPdf(context: ReportExportContext) {
    setPdfBusy(true);
    try { await downloadReportPdf(report, { name: me?.profile?.full_name ?? "Candidate", date, type, transcript, vision, speech, ...context }); }
    catch { toast.error("Could not prepare your PDF. Please try again."); }
    finally { setPdfBusy(false); }
  }
  return <InterviewReportWorkspace report={report} transcript={turns} vision={vision} speech={speech} id={id} name={me?.profile?.full_name ?? "Candidate"} type={type} category={interview.category} date={interview.started_at} duration={interview.duration_s} onPdf={(context) => void exportPdf(context)} onTranscript={downloadTranscript} pdfBusy={pdfBusy} />;
}

function fmt(s: number) {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
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
