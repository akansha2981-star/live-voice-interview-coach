import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, Lightbulb, Loader2, Mic, MicOff, PersonStanding, PhoneOff, Play, ScanFace, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { interviewQuery } from "@/lib/queries";
import { finishInterview } from "@/lib/interview.functions";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createVisionAnalyzer, liveChecks, liveTip, summarizeVision, type LiveCheck, type VisionFrame } from "@/lib/vision";
import { countFillers, wordsPerMinute } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/interview/$id")({
  head: () => ({
    meta: [
      { title: "Interview room — MBA Compass AI Interview" },
      { name: "description", content: "Your live AI mock interview." },
      { property: "og:title", content: "Interview room" },
      { property: "og:description", content: "Live AI mock interview." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(interviewQuery(params.id)),
  component: InterviewRoom,
});

type Turn = { role: "user" | "assistant"; text: string; start_ms: number; end_ms: number };
const MAX_MS = 25 * 60 * 1000;
const EXPECTED_QUESTIONS = 8;
const LOOK_AWAY_MS = 2000;

const CHECK_ICON: Record<LiveCheck["key"], typeof Eye> = { eye: Eye, posture: PersonStanding, framing: ScanFace, light: Sun };

function InterviewRoom() {
  const { id } = Route.useParams();
  const { data: interview } = useSuspenseQuery(interviewQuery(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const finish = useServerFn(finishInterview);
  const videoRef = useRef<HTMLVideoElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  const framesRef = useRef<VisionFrame[]>([]);
  const startedAt = useRef<number>(0);
  const endingRef = useRef(false);
  const lookAwaySince = useRef<number | null>(null);
  const lastSpeech = useRef<{ role: Turn["role"]; at: number } | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [frame, setFrame] = useState<VisionFrame | null>(null);
  const [lookingAway, setLookingAway] = useState(false);
  const [eyeScore, setEyeScore] = useState<number[]>([]);
  const [speaker, setSpeaker] = useState<Turn["role"] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [camError, setCamError] = useState(false);
  const captionsEnd = useRef<HTMLDivElement>(null);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type !== "session.input_transcript.delta" && event.type !== "session.output_transcript.delta") return;
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (!delta) return;
    const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
    lastSpeech.current = { role, at: performance.now() };
    const start = typeof event.start_ms === "number" ? event.start_ms : 0;
    const end = typeof event.end_ms === "number" ? event.end_ms : start;
    const list = turnsRef.current;
    const last = list[list.length - 1];
    if (last && last.role === role) {
      last.text += delta;
      last.end_ms = Math.max(last.end_ms, end);
    } else {
      list.push({ role, text: delta, start_ms: start, end_ms: end });
    }
    setTurns(list.map((t) => ({ ...t })));
  }, []);

  const call = useLiveVoice({ onEvent });

  // Camera + browser-side presentation analysis.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let analyzer: Awaited<ReturnType<typeof createVisionAnalyzer>> | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play().catch(() => {});
        analyzer = await createVisionAnalyzer(video);
        if (cancelled) return analyzer.close();
        timer = setInterval(() => {
          const now = performance.now();
          const f = analyzer?.analyze(now);
          if (!f) return;
          setFrame(f);
          const eyeOk = f.faceVisible && f.gazeCentered;
          if (eyeOk) lookAwaySince.current = null;
          else lookAwaySince.current ??= now;
          setLookingAway(lookAwaySince.current !== null && now - lookAwaySince.current > LOOK_AWAY_MS);
          setEyeScore((prev) => [...prev.slice(-39), eyeOk ? 1 : 0]);
          if (startedAt.current) framesRef.current.push(f);
        }, 400);
      })
      .catch(() => setCamError(true));
    return () => {
      cancelled = true;
      clearInterval(timer);
      analyzer?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (call.status !== "connected" || startedAt.current) return;
    startedAt.current = performance.now();
  }, [call.status]);

  useEffect(() => {
    const t = setInterval(() => {
      const s = lastSpeech.current;
      setSpeaker(s && performance.now() - s.at < 1500 ? s.role : null);
      if (!startedAt.current) return;
      const ms = performance.now() - startedAt.current;
      setElapsed(ms);
      if (ms > MAX_MS && !endingRef.current) void endInterview();
    }, 300);
    return () => clearInterval(t);
  });

  useEffect(() => {
    captionsEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function begin() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return toast.error("Please sign in again.");
    call.start({ token, interview_id: id });
  }

  async function endInterview() {
    if (endingRef.current) return;
    endingRef.current = true;
    setSaving(true);
    call.stop();
    const transcript = turnsRef.current.map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text);
    const userTurns = transcript.filter((t) => t.role === "user");
    const userText = userTurns.map((t) => t.text).join(" ");
    const words = userText.split(/\s+/).filter(Boolean).length;
    const speakingMs = userTurns.reduce((s, t) => s + Math.max(0, t.end_ms - t.start_ms), 0);
    const fillers = countFillers(userText);
    try {
      await finish({
        data: {
          id,
          transcript,
          duration_s: Math.round((startedAt.current ? performance.now() - startedAt.current : 0) / 1000),
          vision_summary: framesRef.current.length ? summarizeVision(framesRef.current, startedAt.current) : null,
          speech_metrics: {
            candidate_words: words,
            candidate_turns: userTurns.length,
            words_per_minute: wordsPerMinute(words, speakingMs),
            filler_total: fillers.total,
            filler_per_100_words: words ? Math.round((fillers.total / words) * 1000) / 10 : 0,
            filler_breakdown: fillers.counts,
            avg_answer_words: userTurns.length ? Math.round(words / userTurns.length) : 0,
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["interview", id] });
      await queryClient.invalidateQueries({ queryKey: ["interviews"] });
      navigate({ to: "/report/$id", params: { id } });
    } catch (err) {
      endingRef.current = false;
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "Could not save the interview");
    }
  }

  if (!interview) return <Navigate to="/dashboard" />;
  if (interview.status !== "in_progress" && !saving) return <Navigate to="/report/$id" params={{ id }} />;

  const mm = String(Math.floor(elapsed / 60000)).padStart(2, "0");
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
  const live = call.status === "connected";
  const checks = liveChecks(frame);
  const tip = camError ? "Camera unavailable — presentation feedback is off." : liveTip(frame);
  const assistantTurns = turns.filter((t) => t.role === "assistant");
  const currentQuestion = assistantTurns[assistantTurns.length - 1]?.text.trim();
  const qIndex = Math.min(assistantTurns.length, EXPECTED_QUESTIONS);
  const eyePct = eyeScore.length ? Math.round((eyeScore.reduce((a, b) => a + b, 0) / eyeScore.length) * 100) : 0;
  const goodCount = checks.filter((c) => c.ok).length;

  return (
    <div className="grid gap-5">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-ink px-5 py-3 text-ink-foreground">
        <div className="flex items-center gap-3">
          <span className="relative grid size-3 place-items-center">
            {live && <span className="absolute size-3 rounded-full bg-destructive animate-ring-pulse" />}
            <span className={`size-2.5 rounded-full ${live ? "bg-destructive" : "bg-ink-muted"}`} />
          </span>
          <span className="text-sm font-semibold">
            {live ? "LIVE" : call.status === "connecting" ? "Connecting…" : saving ? "Saving…" : "Ready"}
          </span>
          <span className="font-mono text-sm text-ink-muted">{mm}:{ss}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          Question {Math.max(qIndex, live ? 1 : 0)} of ~{EXPECTED_QUESTIONS}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-foreground/15">
            <div className="h-full bg-accent transition-all duration-700" style={{ width: `${(qIndex / EXPECTED_QUESTIONS) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-4">
          {/* Camera */}
          <div
            className={`relative aspect-video overflow-hidden rounded-2xl bg-gradient-ink ring-4 transition-all duration-300 ${
              lookingAway && live ? "ring-destructive" : live ? "ring-success/60" : "ring-transparent"
            }`}
          >
            <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            {live && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="h-1/3 w-full bg-gradient-to-b from-transparent via-sky/10 to-transparent animate-scan" />
              </div>
            )}
            {/* Framing guide */}
            <div className="pointer-events-none absolute left-1/2 top-[12%] h-[70%] w-[38%] -translate-x-1/2 rounded-[45%] border-2 border-dashed border-ink-foreground/25" />

            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-ink-foreground">
              <Eye className={`size-3.5 ${lookingAway ? "text-destructive" : "text-success"}`} /> Eye contact {eyePct}%
            </div>

            {lookingAway && !camError && (
              <div className="absolute inset-x-0 top-1/2 mx-auto flex w-fit -translate-y-1/2 animate-rise items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground shadow-soft">
                <AlertTriangle className="size-4 animate-pulse" /> You're not looking at the camera
              </div>
            )}

            {/* Interviewer bubble */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-2xl bg-ink/85 p-2.5 pr-4 text-ink-foreground backdrop-blur">
              <div className="relative grid size-11 place-items-center">
                {speaker === "assistant" && <span className="absolute inset-0 rounded-full bg-accent animate-ring-pulse" />}
                <span className="relative grid size-11 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
                  A
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold">Aria · AI Interviewer</p>
                <div className="mt-1 flex h-4 items-center gap-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-0.5 rounded-full ${speaker ? "animate-wave" : ""} ${speaker === "user" ? "bg-sky" : "bg-accent"}`}
                      style={{ height: speaker ? "100%" : "20%", animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                  <span className="ml-2 text-[10px] text-ink-muted">
                    {speaker === "assistant" ? "Speaking" : speaker === "user" ? "Listening to you" : live ? "Waiting" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current question */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">Current question</p>
            <p key={assistantTurns.length} className="mt-2 animate-rise text-lg font-medium leading-snug">
              {currentQuestion || (live ? "Aria is about to begin…" : "Press Begin interview when you're ready.")}
            </p>
          </div>

          <audio ref={call.audioRef} autoPlay className="hidden" />
          <div className="flex flex-wrap items-center gap-3">
            {!live && call.status !== "connecting" && !saving && (
              <Button size="lg" onClick={begin} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Play className="size-4" /> {call.hasConnected ? "Reconnect" : "Begin interview"}
              </Button>
            )}
            {call.status === "connecting" && (
              <Button size="lg" disabled>
                <Loader2 className="size-4 animate-spin" /> Connecting to Aria…
              </Button>
            )}
            {live && (
              <Button variant="secondary" size="lg" onClick={() => call.setMuted(!call.muted)}>
                {call.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />} {call.muted ? "Unmute" : "Mute"}
              </Button>
            )}
            {call.playbackBlocked && (
              <Button variant="secondary" onClick={call.resumePlayback}>
                Play interviewer audio
              </Button>
            )}
            {(call.hasConnected || turns.length > 0) && (
              <Button variant="destructive" size="lg" onClick={endInterview} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />} End interview
              </Button>
            )}
          </div>
          {call.error && <p className="text-sm text-destructive">{call.error}</p>}
        </div>

        <div className="grid content-start gap-4">
          {/* Live presentation coach */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live presentation</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{goodCount}/4 good</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {checks.map((c) => {
                const Icon = CHECK_ICON[c.key];
                const tone =
                  c.ok === null
                    ? "border-border bg-muted text-muted-foreground"
                    : c.ok
                      ? "border-success/40 bg-success/10"
                      : "border-destructive/40 bg-destructive/10";
                return (
                  <div key={c.key} className={`rounded-xl border p-3 transition-colors duration-300 ${tone}`}>
                    <div className="flex items-center justify-between">
                      <Icon className={`size-4 ${c.ok ? "text-success" : c.ok === false ? "text-destructive" : ""}`} />
                      {c.ok ? <CheckCircle2 className="size-4 text-success" /> : c.ok === false ? <AlertTriangle className="size-4 text-destructive" /> : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                );
              })}
            </div>
            <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm transition-colors ${tip ? "bg-accent/20" : "bg-success/10"}`}>
              <Lightbulb className={`mt-0.5 size-4 shrink-0 ${tip ? "text-accent" : "text-success"}`} />
              <span key={tip ?? "ok"} className="animate-rise">{tip ?? "Great presence — keep it up."}</span>
            </div>
          </div>

          {/* Transcript */}
          <div className="flex max-h-[55vh] min-h-72 flex-col rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Live transcript</h2>
              {live && <span className="flex items-center gap-1.5 text-xs text-destructive"><span className="size-1.5 animate-pulse rounded-full bg-destructive" /> Recording</span>}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {turns.length === 0 && <p className="text-sm text-muted-foreground">Aria speaks first. Answer naturally — you can interrupt anytime.</p>}
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`animate-rise rounded-xl p-3 ${t.role === "assistant" ? "border-l-4 border-accent bg-secondary" : "ml-6 bg-primary text-primary-foreground"}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{t.role === "assistant" ? "Aria" : "You"}</p>
                  <p className="text-sm leading-relaxed">{t.text}</p>
                </div>
              ))}
              <div ref={captionsEnd} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
