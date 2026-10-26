import { type ReactNode, type RefObject } from "react";
import { InterviewTranscript } from "@/components/interview-transcript";
import { transcriptMetrics, type TranscriptTurn } from "@/lib/interview-metrics";
import { liveChecks, liveTip, type VisionFrame } from "@/lib/vision";
import { countFillers } from "@/lib/interview-prompt";
import { PerformancePanel } from "@/components/performance-panel";
import { questionTiming, type AudioSample } from "@/lib/performance";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>; turns: TranscriptTurn[]; frame: VisionFrame | null;
  live: boolean; status: string; timer: string; speaker: "user" | "assistant" | null;
  eyePct: number | null; lookingAway: boolean; camError: boolean; muted: boolean;
  controls: ReactNode; audio: ReactNode; error: string | null;
  audioSample?: AudioSample | null; cameraEnabled?: boolean;
};

export function InterviewWorkspace(p: Props) {
  const metrics = transcriptMetrics(p.turns);
  const questions = questionTiming(p.turns);
  const checks = liveChecks(p.frame);
  const question = p.turns.filter((t) => t.role === "assistant").at(-1)?.text;
  const fillers = countFillers(p.turns.filter((t) => t.role === "user").map((t) => t.text).join(" ")).total;
  const tip = p.camError ? "Camera unavailable. Presentation tracking is paused." : liveTip(p.frame) ?? (p.frame ? "Keep your face centred and look toward the camera lens." : "Waiting for camera analysis.");
  const stats = [{ label: "Answers", value: metrics.answers }, { label: "Words spoken", value: metrics.words }, { label: "Average answer", value: `${metrics.averageWords} words` }, { label: "Filler words", value: fillers }, { label: "Speaking pace", value: metrics.pace === null ? "Not measured" : `${metrics.pace} wpm` }, { label: "Approx. eye contact", value: p.eyePct === null ? "Not measured" : `${p.eyePct}%` }];
  const tracking = <section aria-label="Live tracking" className="h-full min-h-0 overflow-y-auto overscroll-contain bg-card p-4">
    <div className="flex items-center justify-between"><h2 className="font-bold">Live tracking</h2><span className="text-xs text-muted-foreground">Live signals</span></div>
    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{stats.map((s) => <div key={s.label} className="border-b pb-2"><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-0.5 text-base font-bold tabular-nums">{s.value}</p></div>)}</div>
    <div className="mt-4 divide-y">{[{ key: "face", label: "Face visibility", ok: p.frame ? p.frame.faceVisible : null, detail: p.frame ? p.frame.faceVisible ? "Face detected" : "Move into the camera frame" : "Waiting for camera" }, ...checks].map((c) => <div key={c.key} className="flex items-center justify-between gap-3 py-2"><div><p className="text-sm font-semibold">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div><span className={`shrink-0 text-xs font-bold ${c.ok === null ? "text-muted-foreground" : c.ok ? "text-success" : "text-destructive"}`}>{c.ok === null ? "Waiting" : c.ok ? "Good" : "Adjust"}</span></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Eye contact is approximate. Interview scores appear in your final report.</p>
    <PerformancePanel frame={p.frame} turns={p.turns} sample={p.audioSample ?? null} live={p.live} />
  </section>;
  return <div className="flex h-full min-h-0 w-full flex-col bg-background">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-2.5 md:px-6"><div className="min-w-0"><h1 className="truncate text-base font-bold">MBA Compass · Interview room</h1><p className="text-xs text-muted-foreground">Aria · MBA interview · {questions.length} questions so far</p></div><div className="flex shrink-0 items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs"><span className={`size-2 rounded-full ${p.live ? "bg-success motion-safe:animate-pulse" : "bg-muted-foreground"}`} /><span>{p.status}</span><span className="font-bold tabular-nums">{p.timer}</span></div></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:grid lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(300px,360px)] lg:gap-4 lg:overflow-hidden lg:p-4">
      <div className="flex min-h-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <div className="relative h-[42vh] min-h-48 overflow-hidden rounded-lg bg-ink text-ink-foreground lg:h-auto lg:flex-1">
          <video ref={p.videoRef} muted playsInline className="h-full w-full -scale-x-100 object-contain" />
          <div className="absolute left-3 top-3 bg-ink/80 px-3 py-1 text-xs">You · {p.muted ? "Microphone muted" : "Candidate"}</div>
          <div className="absolute right-3 top-3 bg-ink/80 px-3 py-1 text-xs tabular-nums">Eye contact {p.eyePct === null ? "—" : `${p.eyePct}%`}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-ink/85 px-4 py-2.5"><span className={`grid size-9 shrink-0 place-items-center rounded-full border border-sky bg-ink font-bold text-sky ${p.speaker === "assistant" ? "motion-safe:animate-ring-pulse" : ""}`}>A</span><div><p className="text-xs font-bold text-sky">Aria · AI interviewer</p><p className="mt-0.5 text-xs">{p.speaker === "assistant" ? "Speaking" : p.speaker === "user" ? "Listening to you" : p.live ? "Listening" : "Ready when you are"}</p></div></div>
          {p.cameraEnabled === false && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm">Camera paused · visual tracking unavailable</div>}
          {p.camError && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm">Camera unavailable</div>}
          {p.lookingAway && p.live && !p.camError && <p role="status" className="absolute inset-x-3 top-12 rounded-md bg-destructive px-3 py-2 text-center text-sm font-bold text-destructive-foreground">Look toward the camera lens</p>}
        </div>
        <section className="shrink-0 rounded-lg border bg-card px-4 py-3"><h2 className="text-xs font-bold uppercase text-primary">Current question</h2><div role="region" aria-label="Current question" tabIndex={0} className="mt-1.5 max-h-24 overflow-y-auto overscroll-contain"><p className="break-words text-base font-semibold leading-relaxed">{question || (p.live ? "Aria is about to begin…" : "Begin when you are ready for your MBA interview.")}</p></div></section>
        <p className={`shrink-0 rounded-md border-l-2 px-3 py-2 text-xs ${p.lookingAway ? "border-destructive bg-destructive/10" : "border-primary bg-secondary"}`}>{tip}</p>
      </div>
      <div className="mt-3 flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-lg border lg:col-start-1 lg:row-start-1 lg:mt-0 lg:h-auto">{tracking}</div>
      <div className="mt-3 flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-lg border bg-card lg:col-start-3 lg:row-start-1 lg:mt-0 lg:h-auto"><InterviewTranscript turns={p.turns} live={p.live} /></div>
    </div>
    {p.audio}
    <footer className="shrink-0 border-t bg-card px-3 py-3 md:px-5"><div className="flex flex-wrap items-center justify-center gap-2 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs">{p.controls}</div>{p.error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{p.error}</p>}</footer>
  </div>;
}