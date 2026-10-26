import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { isProfileReady } from "@/lib/interview-prompt";
import { createVisionAnalyzer, liveTip } from "@/lib/vision";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/interview/check")({
  head: () => ({
    meta: [
      { title: "Equipment check — MBA Compass AI Interview" },
      { name: "description", content: "Test your camera and microphone before the interview." },
      { property: "og:title", content: "Equipment check" },
      { property: "og:description", content: "Get ready for your AI interview." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: CheckPage,
});

function CheckPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [tip, setTip] = useState<string | null>("Loading camera analysis…");
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  async function enable() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      setStream(s);
      setMediaError(null);
    } catch {
      setMediaError("We couldn't access your camera or microphone. Allow access in your browser and try again.");
    }
  }

  useEffect(() => {
    if (!stream) return;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      void video.play();
    }
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(100, (peak / 64) * 100));
      raf = requestAnimationFrame(loop);
    };
    loop();
    let analyzer: Awaited<ReturnType<typeof createVisionAnalyzer>> | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    if (video) {
      createVisionAnalyzer(video)
        .then((a) => {
          if (cancelled) return a.close();
          analyzer = a;
          timer = setInterval(() => setTip(liveTip(a.analyze(performance.now())) ?? "Looking good — you're well framed."), 700);
        })
        .catch(() => setTip("Camera analysis unavailable on this device. You can still continue."));
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(timer);
      analyzer?.close();
      void audioCtx.close();
      stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function begin() {
    setStarting(true);
    const { data, error } = await supabase.rpc("start_interview");
    setStarting(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/interview/$id", params: { id: data as string } });
  }

  if (!isProfileReady(me.profile)) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-semibold">Complete your profile first</h1>
        <Button asChild className="mt-6">
          <Link to="/profile">Go to profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="text-4xl font-semibold">Before we begin</h1>
        <p className="mt-1 text-muted-foreground">Check your camera, microphone and lighting.</p>
        <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-ink">
          <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          {!stream && (
            <div className="absolute inset-0 grid place-items-center">
              <Button onClick={enable} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Turn on camera & mic
              </Button>
            </div>
          )}
          {stream && tip && (
            <div className="absolute inset-x-4 bottom-4 rounded-lg bg-ink/80 px-4 py-2 text-sm text-ink-foreground">{tip}</div>
          )}
        </div>
        {mediaError && <p className="mt-3 text-sm text-destructive">{mediaError}</p>}
        {stream && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mic</span>
            <Progress value={level} className="flex-1" />
            <span className="w-28 text-xs text-muted-foreground">{level > 15 ? "We can hear you" : "Say something…"}</span>
          </div>
        )}
      </div>
      <div className="grid content-start gap-4 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Checklist</h2>
        {[
          "Quiet room, phone on silent",
          "Light in front of you, not behind",
          "Camera at eye level, shoulders visible",
          "Headphones recommended to avoid echo",
          "About 15 minutes of uninterrupted time",
        ].map((t) => (
          <p key={t} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {t}
          </p>
        ))}
        <label className="mt-2 flex items-start gap-3 rounded-lg bg-muted p-3 text-sm">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span>
            I agree that my spoken answers will be transcribed and analysed, and that my webcam is analysed in my browser for
            presentation feedback (no video is uploaded). One interview credit will be used.
          </span>
        </label>
        <p className="text-sm text-muted-foreground">Credits available: {me.credits}</p>
        <Button size="lg" disabled={!stream || !consent || starting || me.credits < 1} onClick={begin}>
          {starting && <Loader2 className="size-4 animate-spin" />} Enter interview room
        </Button>
      </div>
    </div>
  );
}
