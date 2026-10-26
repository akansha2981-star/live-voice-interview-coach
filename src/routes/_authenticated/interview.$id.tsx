import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { interviewQuery } from "@/lib/queries";
import { finishInterview } from "@/lib/interview.functions";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createVisionAnalyzer, summarizeVision, type VisionFrame } from "@/lib/vision";
import { countFillers, wordsPerMinute } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { InterviewWorkspace } from "@/components/interview-workspace";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { questionTiming, summarizeAudio, type AudioSample } from "@/lib/performance";

export const Route = createFileRoute("/_authenticated/interview/$id")({
  head: () => ({
    meta: [
      { title: "Interview room — MBA Compass AI Interview" },
      { name: "description", content: "Your live AI mock interview." },
      { property: "og:title", content: "Live interview room — MBA Compass" },
      { property: "og:description", content: "Live AI mock interview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(interviewQuery(params.id)),
  component: InterviewRoom,
});

type Turn = { role: "user" | "assistant"; text: string; start_ms: number; end_ms: number };
const MAX_MS = 25 * 60 * 1000;
const LOOK_AWAY_MS = 2000;


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
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [audioSample, setAudioSample] = useState<AudioSample | null>(null);
  const audioSamples = useRef<AudioSample[]>([]);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.type !== "session.input_transcript.delta" && event.type !== "session.output_transcript.delta") return;
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (!delta) return;
    const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
    lastSpeech.current = { role, at: performance.now() };
    const observed = startedAt.current ? performance.now() - startedAt.current : 0;
    const start = typeof event.start_ms === "number" ? event.start_ms : observed;
    const end = typeof event.end_ms === "number" ? event.end_ms : observed;
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

  const call = useLiveVoice({ onEvent, onAudioSample: (sample) => { setAudioSample(sample); if (startedAt.current) audioSamples.current.push(sample); } });

  // Camera + browser-side presentation analysis.
  useEffect(() => {
    if (!cameraEnabled) { setFrame(null); setLookingAway(false); return; }
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
  }, [cameraEnabled]);

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
            words_per_minute: speakingMs > 0 ? wordsPerMinute(words, speakingMs) : null,
            filler_total: fillers.total,
            filler_per_100_words: words ? Math.round((fillers.total / words) * 1000) / 10 : 0,
            filler_breakdown: fillers.counts,
            avg_answer_words: userTurns.length ? Math.round(words / userTurns.length) : 0,
            audio: summarizeAudio(audioSamples.current, startedAt.current),
            question_timing: questionTiming(transcript),
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
  const eyePct = eyeScore.length ? Math.round((eyeScore.reduce((a, b) => a + b, 0) / eyeScore.length) * 100) : null;
  const controls = <>
    {!call.hasConnected && call.status !== "connecting" && <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>}
    {!live && call.status !== "connecting" && !saving && <Button onClick={begin}>{call.hasConnected ? "Reconnect" : "Begin interview"}</Button>}
    {call.status === "connecting" && <Button disabled>Connecting to Aria…</Button>}
    {live && <Button variant="secondary" onClick={() => call.setMuted(!call.muted)}>{call.muted ? "Unmute microphone" : "Mute microphone"}</Button>}
    <Button variant="outline" onClick={() => setCameraEnabled((enabled) => !enabled)}>{cameraEnabled ? "Turn camera off" : "Turn camera on"}</Button>
    {call.playbackBlocked && <Button variant="secondary" onClick={call.resumePlayback}>Play interviewer audio</Button>}
    {(call.hasConnected || turns.length > 0) && <Button variant="destructive" onClick={endInterview} disabled={saving}>{saving ? "Saving your interview…" : "End interview"}</Button>}
  </>;
  return <Dialog open><DialogContent aria-describedby={undefined} onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} className="inset-0 left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-none [&>button]:hidden"><DialogTitle className="sr-only">MBA Compass live interview</DialogTitle>
    <InterviewWorkspace videoRef={videoRef} turns={turns} frame={frame} live={live} status={saving ? "Saving…" : live ? "Live" : call.status === "connecting" ? "Connecting…" : "Ready"} timer={`${mm}:${ss}`} speaker={speaker} eyePct={eyePct} lookingAway={lookingAway} camError={camError} muted={call.muted} controls={controls} audio={<audio ref={call.audioRef} autoPlay className="hidden" />} error={call.error} audioSample={audioSample} cameraEnabled={cameraEnabled} />
  </DialogContent></Dialog>;
}
