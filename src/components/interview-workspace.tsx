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
  return <div className="interview-room flex h-full min-h-0 w-full flex-col bg-background">
    <header className="interview-room-header flex shrink-0 items-center justify-between gap-2 border-b bg-card px-4 py-2"><div className="min-w-0"><h1 className="truncate text-sm font-bold">MBA Compass · Interview room</h1><p className="text-[11px] text-muted-foreground">Aria · {questions.length} questions</p></div><div className="flex shrink-0 items-center gap-2 text-xs"><span className={`size-2 rounded-full ${p.live ? "bg-success motion-safe:animate-pulse" : "bg-muted-foreground"}`} /><span>{p.status}</span><span className="font-bold tabular-nums">{p.timer}</span></div></header>
    <div className="interview-room-body">
      <div className="interview-conversation">
        <section aria-label="Candidate camera" className="interview-camera relative min-h-0 overflow-hidden rounded-lg border bg-card">
          <video ref={p.videoRef} muted playsInline className="h-full w-full -scale-x-100 object-contain" />
          <div className="absolute left-2 top-2 rounded border bg-card/95 px-2 py-1 text-[11px]">You · {p.muted ? "Muted" : "Candidate"}</div>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t bg-card/95 px-3 py-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary ${p.speaker === "assistant" ? "motion-safe:animate-pulse" : ""}`}>A</span><div className="text-[11px]"><p className="font-bold text-primary">Aria · AI interviewer</p><p>{p.speaker === "assistant" ? "Speaking" : p.speaker === "user" ? "Listening to you" : p.live ? "Listening" : "Ready"}</p></div></div>
          {p.cameraEnabled === false && <div className="absolute inset-0 grid place-items-center bg-card p-3 text-center text-xs">Camera paused</div>}
          {p.camError && <div className="absolute inset-0 grid place-items-center bg-card p-3 text-center text-xs">Camera unavailable</div>}
          {p.lookingAway && p.live && !p.camError && <p role="status" className="absolute inset-x-2 top-10 rounded border border-destructive bg-card px-2 py-1 text-center text-xs font-bold text-destructive">Look toward the camera lens</p>}
        </section>
        <section className="interview-question min-w-0 border-l-2 border-primary bg-secondary px-3 py-2"><h2 className="text-[10px] font-bold uppercase text-primary">Current question</h2><p className="mt-1 break-words text-sm font-semibold leading-snug">{question || (p.live ? "Aria is about to begin…" : "Begin when you are ready for your MBA interview.")}</p><p className="mt-2 text-[11px] leading-snug text-muted-foreground">{tip}</p></section>
        <div className="interview-captions min-h-0 min-w-0 overflow-hidden rounded-lg border bg-card"><InterviewTranscript turns={p.turns} live={p.live} compact /></div>
      </div>
      <section aria-label="Live tracking" className="interview-tracking min-w-0 border-t bg-card">
        <div className="flex items-center justify-between gap-2 px-3 py-2"><h2 className="text-sm font-bold">Live tracking</h2><p className="text-[10px] text-muted-foreground">Observable signals · estimates</p></div>
        <div className="interview-signal-grid">{stats.map((s) => <div key={s.label} className="interview-signal"><p className="text-[10px] leading-tight text-muted-foreground">{s.label}</p><p className="mt-1 text-sm font-bold leading-tight tabular-nums">{s.value}</p></div>)}
          {[{ key: "face", label: "Face visibility", ok: p.frame ? p.frame.faceVisible : null, detail: p.frame ? p.frame.faceVisible ? "Face detected" : "Move into frame" : "Waiting for camera" }, ...checks].map((c) => <div key={c.key} className="interview-signal" title={c.detail}><p className="text-[10px] leading-tight text-muted-foreground">{c.label}</p><p className={`mt-1 text-sm font-bold leading-tight ${c.ok === null ? "text-muted-foreground" : c.ok ? "text-success" : "text-destructive"}`}>{c.ok === null ? "Waiting" : c.ok ? "Good" : "Adjust"}</p></div>)}
        </div>
        <PerformancePanel frame={p.frame} turns={p.turns} sample={p.audioSample ?? null} live={p.live} compact />
      </section>
    </div>
    {p.audio}
    <footer className="shrink-0 border-t bg-card px-3 py-3 md:px-5"><div className="flex flex-wrap items-center justify-center gap-2 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs">{p.controls}</div>{p.error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{p.error}</p>}</footer>
  </div>;
}