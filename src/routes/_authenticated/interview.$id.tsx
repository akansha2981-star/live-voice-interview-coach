import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, PhoneOff, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { interviewQuery } from "@/lib/queries";
import { finishInterview } from "@/lib/interview.functions";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createVisionAnalyzer, liveTip, summarizeVision, type VisionFrame } from "@/lib/vision";
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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [tip, setTip] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const captionsEnd = useRef<HTMLDivElement>(null);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type !== "session.input_transcript.delta" && event.type !== "session.output_transcript.delta") return;
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (!delta) return;
    const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
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
          const f = analyzer?.analyze(performance.now());
          if (!f) return;
          setTip(liveTip(f));
          if (startedAt.current) framesRef.current.push(f);
        }, 500);
      })
      .catch(() => setTip("Camera unavailable — presentation feedback will be limited."));
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
      if (!startedAt.current) return;
      const ms = performance.now() - startedAt.current;
      setElapsed(ms);
      if (ms > MAX_MS && !endingRef.current) void endInterview();
    }, 1000);
    return () => clearInterval(t);
  });

  useEffect(() => {
    captionsEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-ink">
          <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1 text-xs text-ink-foreground">
            <span className={`size-2 rounded-full ${live ? "animate-pulse bg-destructive" : "bg-ink-muted"}`} />
            {live ? `Live · ${mm}:${ss}` : call.status === "connecting" ? "Connecting…" : "Not started"}
          </div>
          {tip && live && (
            <div className="absolute inset-x-4 bottom-4 rounded-lg bg-ink/80 px-4 py-2 text-sm text-ink-foreground">{tip}</div>
          )}
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
      <div className="flex max-h-[70vh] flex-col rounded-2xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Live captions</h2>
          <p className="text-xs text-muted-foreground">Aria will speak first. Answer naturally — you can interrupt anytime.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 && <p className="text-sm text-muted-foreground">Captions will appear here.</p>}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "assistant" ? "" : "rounded-lg bg-muted p-3"}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.role === "assistant" ? "Aria" : "You"}
              </p>
              <p className="text-sm leading-relaxed">{t.text}</p>
            </div>
          ))}
          <div ref={captionsEnd} />
        </div>
      </div>
    </div>
  );
}
