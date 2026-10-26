import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { bookingQuery, meQuery } from "@/lib/queries";
import { isProfileReady } from "@/lib/interview-prompt";
import { createVisionAnalyzer, liveTip } from "@/lib/vision";
import { MIC_PHRASE, preflightReady, slotPhase, speechMatches } from "@/lib/booking";
import { checkConnection, confirmPreflight } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognizer = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: SpeechResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
export const Route = createFileRoute("/_authenticated/interview/check")({
 validateSearch: z.object({ booking: z.string().optional() }),
 head: () => ({ meta: [{ title: "Equipment verification — MBA Compass AI Interview" }, { name: "description", content: "Verify connection, visible face and spoken microphone before your booked interview." }, { property: "og:title", content: "Equipment verification — MBA Compass" }, { property: "og:description", content: "Prepare for your scheduled MBA interview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
 loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(bookingQuery)]),
 component: CheckPage,
});
function CheckPage() {
 const { data: me } = useSuspenseQuery(meQuery);
 const { data: bookings } = useSuspenseQuery(bookingQuery);
 const { booking: requested } = Route.useSearch();
 const navigate = useNavigate(); const qc = useQueryClient();
 const connection = useServerFn(checkConnection); const confirm = useServerFn(confirmPreflight);
 const videoRef = useRef<HTMLVideoElement>(null); const recorderRef = useRef<MediaRecorder | null>(null); const recognitionRef = useRef<SpeechRecognizer | null>(null); const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const audioRef = useRef<HTMLAudioElement>(null); const chunks = useRef<Blob[]>([]); const peakRef = useRef(0);
 const [stream, setStream] = useState<MediaStream | null>(null);
 const [faceVisible, setFaceVisible] = useState(false); const [level, setLevel] = useState(0); const [tip, setTip] = useState("Turn on your camera to verify your face.");
 const [network, setNetwork] = useState<{ downloadMbps: number; latencyMs: number } | null>(null); const [testing, setTesting] = useState(false);
 const [consent, setConsent] = useState(false); const [starting, setStarting] = useState(false); const [mediaError, setMediaError] = useState<string | null>(null);
 const [recording, setRecording] = useState(false); const [micConfirmed, setMicConfirmed] = useState(false); const [recordingUrl, setRecordingUrl] = useState<string | null>(null); const [played, setPlayed] = useState(false); const [speech, setSpeech] = useState(""); const [now, setNow] = useState(Date.now());
 const booking = bookings.bookings.find((b) => b.status === "booked" && (requested ? b.id === requested : b.interview_slots && slotPhase(b.interview_slots.starts_at,b.interview_slots.ends_at,now) === "ready"));
 const phase = booking?.interview_slots ? slotPhase(booking.interview_slots.starts_at,booking.interview_slots.ends_at,now) : null;
 useEffect(() => { const t = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(t); }, []);
 useEffect(() => () => { recognitionRef.current?.stop(); if (recordingTimer.current) clearTimeout(recordingTimer.current); if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }, []);
 useEffect(() => () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);
 async function testNetwork() {
   setTesting(true); setNetwork(null);
   try {
     const ping = performance.now(); await connection(); const latencyMs = performance.now() - ping;
     const start = performance.now(); const response = await connection(); const elapsed = Math.max(1,performance.now() - start);
     setNetwork({ downloadMbps: response.payload.length * 8 / (elapsed * 1000), latencyMs: Math.round(latencyMs) });
   } catch (e) { toast.error(e instanceof Error ? e.message : "Connection check failed."); } finally { setTesting(false); }
 }
 async function enable() {
   try { const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true }); setStream(s); setMediaError(null); } catch { setMediaError("Allow camera and microphone access, then try again."); }
 }
 useEffect(() => {
   if (!stream) return;
   const video = videoRef.current; let analyzer: Awaited<ReturnType<typeof createVisionAnalyzer>> | null = null; let cancelled = false; let timer: ReturnType<typeof setInterval> | undefined;
   const audio = new AudioContext(); const meter = audio.createAnalyser(); audio.createMediaStreamSource(stream).connect(meter); const buf = new Uint8Array(meter.fftSize); let raf = 0;
   function loop() { meter.getByteTimeDomainData(buf); let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v-128)); peakRef.current = Math.max(peakRef.current,peak); setLevel(Math.min(100,peak/64*100)); raf = requestAnimationFrame(loop); } loop();
   if (video) { video.srcObject = stream; void video.play().then(() => createVisionAnalyzer(video)).then((a) => { if (cancelled) return a.close(); analyzer = a; timer = setInterval(() => { const f = a.analyze(performance.now()); setFaceVisible(Boolean(f?.faceVisible)); setTip(liveTip(f) ?? "Face verified. You are well framed."); }, 500); }).catch(() => { setFaceVisible(false); setTip("Face verification unavailable. Try a supported browser or another device."); }); }
   return () => { cancelled = true; cancelAnimationFrame(raf); clearInterval(timer); analyzer?.close(); void audio.close(); stream.getTracks().forEach((t) => t.stop()); };
 }, [stream]);
 function verifyMic() {
   if (!stream) return;
   setMicConfirmed(false); setPlayed(false); setSpeech(""); setRecordingUrl(null); peakRef.current = 0; chunks.current = [];
   if (!window.MediaRecorder) return toast.error("Audio verification is unavailable in this browser.");
   const rec = new MediaRecorder(new MediaStream(stream.getAudioTracks())); recorderRef.current = rec;
   rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
   rec.onstop = () => { setRecording(false); recognitionRef.current?.stop(); if (peakRef.current < 5) return toast.error("No speech detected. Check your microphone and try again."); setRecordingUrl(URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType }))); };
   const browser = window as typeof window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer };
   const Recognizer = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
   if (Recognizer) { const r = new Recognizer(); recognitionRef.current = r; r.lang = "en-IN"; r.continuous = true; r.interimResults = true; r.onresult = (e) => { let text = ""; for (let i=0; i<e.results.length; i++) text += e.results[i][0].transcript + " "; setSpeech(text.trim()); if (speechMatches(text)) setMicConfirmed(true); }; r.onerror = () => {}; r.onend = () => {}; try { r.start(); } catch {} }
   rec.start(); setRecording(true); recordingTimer.current = setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 9000);
 }
 const values = { downloadMbps: network?.downloadMbps ?? 0, latencyMs: network?.latencyMs ?? 9999, faceVisible, micConfirmed, consent };
 async function begin() {
   if (!booking || phase !== "ready" || !preflightReady(values)) return;
   setStarting(true);
   try { await confirm({ data: { bookingId: booking.id, ...values } }); const { data, error } = await supabase.rpc("start_interview"); if (error) throw error; if (!data) throw new Error("Interview could not start."); await Promise.all([qc.invalidateQueries({ queryKey: ["bookings"] }),qc.invalidateQueries({ queryKey: ["me"] })]); navigate({ to: "/interview/$id", params: { id: data } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open interview."); } finally { setStarting(false); }
 }
 if (!isProfileReady(me.profile)) return <div><h1 className="text-3xl font-bold">Complete your profile first</h1><Button asChild className="mt-5"><Link to="/profile">Go to profile</Link></Button></div>;
 if (!booking || phase !== "ready") return <div className="grid gap-4"><h1 className="text-3xl font-bold">Your booked interview</h1><p className="text-muted-foreground">{phase === "upcoming" ? "Equipment verification opens at your scheduled start time." : "Book an available slot first. Equipment verification opens during your scheduled time."}</p><Button asChild className="w-fit"><Link to="/slots">View interview slots</Link></Button></div>;
 const stages = [{ title: "Internet connection", done: network !== null && network.downloadMbps >= 1 && network.latencyMs < 1500 }, { title: "Camera & face", done: faceVisible }, { title: "Spoken microphone test", done: micConfirmed }];
 return <div className="grid gap-6"><div><p className="text-sm font-semibold text-primary">Booked interview · Equipment verification</p><h1 className="mt-1 text-3xl font-bold">Before your interview</h1></div><ol className="grid grid-cols-3 border-y bg-card p-4">{stages.map((s,i) => <li key={s.title} className="flex flex-col items-center gap-2 text-center text-sm"><span className={`grid size-8 place-items-center rounded-full font-bold ${s.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{i+1}</span><span>{s.title}</span><span className={`text-xs ${s.done ? "text-success" : "text-muted-foreground"}`}>{s.done ? "Verified" : "Pending"}</span></li>)}</ol>
 <div className="grid gap-6 lg:grid-cols-2"><div><div className="relative aspect-video overflow-hidden rounded-lg bg-ink"><video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />{!stream && <div className="absolute inset-0 grid place-items-center"><Button onClick={enable}>Open camera & microphone</Button></div>}{stream && <p className="absolute inset-x-3 bottom-3 rounded-md bg-ink/85 p-3 text-sm text-ink-foreground">{tip}</p>}</div>{mediaError && <p className="mt-3 text-sm text-destructive">{mediaError}</p>}<p className="mt-3 text-xs text-muted-foreground">Camera analysis stays on your device. No video is uploaded.</p></div>
 <div className="grid content-start gap-6"><section className="border-b pb-5"><h2 className="text-lg font-bold">1. Internet connection</h2><p className="mt-1 text-sm text-muted-foreground">{network ? `${network.downloadMbps.toFixed(1)} Mbps estimated download · ${network.latencyMs} ms round trip` : "Check your connection to the interview service."}</p><p className="mt-1 text-xs text-muted-foreground">Estimated download only; upload and call stability may differ.</p><Button className="mt-3" variant="outline" onClick={testNetwork} disabled={testing}>{testing ? "Checking…" : "Check internet"}</Button>{network && !stages[0].done && <p className="mt-2 text-sm text-destructive">Your connection is too slow or delayed. Improve it and check again.</p>}</section>
 <section><h2 className="text-lg font-bold">2. Read this aloud</h2><blockquote className="my-3 border-l-2 border-primary bg-secondary p-4 text-base">{MIC_PHRASE}</blockquote><div className="flex items-center gap-3"><Progress value={level} className="flex-1" /><span className="w-12 text-xs">{Math.round(level)}%</span></div><Button className="mt-3" onClick={verifyMic} disabled={!stream || recording}>{recording ? "Listening for 9 seconds…" : "Record microphone test"}</Button>{speech && <p className="mt-2 text-sm text-muted-foreground">Heard: {speech}</p>}{recordingUrl && <div className="mt-3 grid gap-3"><audio ref={audioRef} src={recordingUrl} onEnded={() => setPlayed(true)} /><Button variant="outline" onClick={() => void audioRef.current?.play()}>Play my recording</Button>{!micConfirmed && <Button variant="secondary" disabled={!played} onClick={() => setMicConfirmed(true)}>I heard the displayed sentence clearly</Button>}</div>}{micConfirmed && <p className="mt-2 text-sm font-semibold text-success">Microphone verified</p>}</section></div></div>
 <div className="flex flex-wrap items-center justify-between gap-5 border-t pt-5"><label className="flex max-w-2xl items-start gap-3 text-sm"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} /><span>I consent to spoken-answer transcription and browser-only camera analysis for presentation feedback. Starting uses one interview credit.</span></label><Button size="lg" disabled={!preflightReady(values) || starting || me.credits < 1} onClick={begin}>{starting ? "Opening interview…" : "Start interview"}</Button></div>
 </div>;
}
