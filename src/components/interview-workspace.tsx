import { useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
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
  const [view, setView] = useState("room");
  const metrics = transcriptMetrics(p.turns);
  const questions = questionTiming(p.turns);
  const checks = liveChecks(p.frame);
  const question = p.turns.filter((t) => t.role === "assistant").at(-1)?.text;
  const fillers = countFillers(p.turns.filter((t) => t.role === "user").map((t) => t.text).join(" ")).total;
  const tip = p.camError ? "Camera unavailable. Presentation tracking is paused." : liveTip(p.frame) ?? (p.frame ? "Keep your face centred and look toward the camera lens." : "Waiting for camera analysis.");
  const stats = [{ label: "Answers", value: metrics.answers }, { label: "Words spoken", value: metrics.words }, { label: "Average answer", value: `${metrics.averageWords} words` }, { label: "Filler words", value: fillers }, { label: "Speaking pace", value: metrics.pace === null ? "Not measured" : `${metrics.pace} wpm` }, { label: "Approx. eye contact", value: p.eyePct === null ? "Not measured" : `${p.eyePct}%` }];
  const tracking = <section aria-label="Live tracking" className="h-full min-h-0 overflow-y-auto overscroll-contain bg-card p-4">
    <div className="flex items-center justify-between"><h2 className="font-bold">Presentation & speech</h2><span className="text-xs text-muted-foreground">Live signals</span></div>
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">{stats.map((s) => <div key={s.label} className="border-b pb-2"><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p></div>)}</div>
    <div className="mt-4 divide-y">{[{ key: "face", label: "Face visibility", ok: p.frame ? p.frame.faceVisible : null, detail: p.frame ? p.frame.faceVisible ? "Face detected" : "Move into the camera frame" : "Waiting for camera" }, ...checks].map((c) => <div key={c.key} className="flex items-center justify-between gap-3 py-2"><div><p className="text-sm font-semibold">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div><span className={`shrink-0 text-xs font-bold ${c.ok === null ? "text-muted-foreground" : c.ok ? "text-success" : "text-destructive"}`}>{c.ok === null ? "Waiting" : c.ok ? "Good" : "Adjust"}</span></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Eye contact is approximate. Interview scores appear in your final report.</p>
    <PerformancePanel frame={p.frame} turns={p.turns} sample={p.audioSample ?? null} live={p.live} />
  </section>;
  return <div className="flex h-full min-h-0 w-full flex-col bg-background">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6"><div><h1 className="text-base font-bold">MBA Compass · Interview room</h1><p className="text-xs text-muted-foreground">Aria · MBA interview</p></div><div className="flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${p.live ? "bg-success motion-safe:animate-pulse" : "bg-muted-foreground"}`} /><span>{p.status}</span><span className="font-bold tabular-nums">{p.timer}</span></div></header>
    <nav aria-label="Interview views" className="flex shrink-0 gap-2 border-b bg-card px-3 py-2 lg:hidden">{[{ key: "room", label: "Interview" }, { key: "tracking", label: "Tracking" }, { key: "transcript", label: "Transcript" }].map((v) => <Button size="sm" variant={view === v.key ? "secondary" : "ghost"} aria-pressed={view === v.key} key={v.key} onClick={() => setView(v.key)}>{v.label}</Button>)}</nav>
    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-3 md:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
      <div className={`${view === "room" ? "flex" : "hidden"} min-h-0 flex-col gap-3 lg:flex`}>
        <div className="relative min-h-32 flex-1 overflow-hidden rounded-lg bg-ink text-ink-foreground">
          <video ref={p.videoRef} muted playsInline className="h-full w-full -scale-x-100 object-contain" />
          <div className="absolute left-3 top-3 bg-ink/80 px-3 py-1 text-xs">You · {p.muted ? "Microphone muted" : "Candidate"}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-ink/85 px-4 py-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full border border-sky bg-ink font-bold text-sky ${p.speaker === "assistant" ? "motion-safe:animate-ring-pulse" : ""}`}>A</span><div><p className="text-xs font-bold text-sky">Aria · AI interviewer</p><p className="mt-1 text-xs">{p.speaker === "assistant" ? "Speaking" : p.speaker === "user" ? "Listening to you" : p.live ? "Listening" : "Ready when you are"}</p></div><span className="ml-auto text-xs text-ink-muted">Voice interview</span></div>
          {p.cameraEnabled === false && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm">Camera paused · visual tracking unavailable</div>}
          {p.camError && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm">Camera unavailable</div>}
          {p.lookingAway && p.live && !p.camError && <p role="status" className="absolute inset-x-3 top-14 rounded-md bg-destructive px-3 py-2 text-center text-sm font-bold text-destructive-foreground">Look toward the camera lens</p>}
        </div>
        <section className="flex min-h-0 shrink-0 flex-col border-t bg-card px-4 py-3"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-bold uppercase text-primary">Current interviewer question</h2><span className="text-xs text-muted-foreground">{questions.length} questions / follow-ups</span></div><div role="region" aria-label="Current question" tabIndex={0} className="mt-2 max-h-28 overflow-y-auto overscroll-contain"><p className="break-words text-base font-semibold leading-relaxed">{question || (p.live ? "Aria is about to begin…" : "Begin when you are ready for your MBA interview.")}</p></div><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{metrics.answers} responses</span><span>{metrics.words} words</span><span>{metrics.pace == null ? "Pace not measured" : `Approx. ${metrics.pace} wpm`}</span><span>{fillers} possible fillers</span></div></section>
        <p className={`shrink-0 border-l-2 px-3 py-2 text-xs ${p.lookingAway ? "border-destructive bg-destructive/10" : "border-primary bg-secondary"}`}>{tip}</p>
      </div>
      <div className={`${view === "room" ? "hidden" : "flex"} min-h-0 flex-col overflow-hidden border bg-card lg:flex`}>
        <div className="hidden shrink-0 gap-2 border-b px-3 py-2 lg:flex"><Button size="sm" variant={view !== "tracking" ? "secondary" : "ghost"} onClick={() => setView("transcript")}>Full transcript</Button><Button size="sm" variant={view === "tracking" ? "secondary" : "ghost"} onClick={() => setView("tracking")}>Live tracking</Button></div>
        <div className={`${view === "tracking" ? "hidden" : "flex"} min-h-0 flex-1 flex-col`}><InterviewTranscript turns={p.turns} live={p.live} /></div>
        {view === "tracking" && <div className="min-h-0 flex-1">{tracking}</div>}
      </div>
    </div>
    {p.audio}
    <footer className="shrink-0 border-t bg-card px-3 py-3 md:px-5"><div className="flex flex-wrap items-center justify-center gap-2 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs">{p.controls}</div>{p.error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{p.error}</p>}</footer>
  </div>;
}