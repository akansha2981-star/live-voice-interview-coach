import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_COACHING, shouldAlert, type AudioSample, type CoachingAlert } from "@/lib/performance";
import { transcriptMetrics, type TranscriptTurn } from "@/lib/interview-metrics";
import { liveTip, type VisionFrame } from "@/lib/vision";

export function PerformancePanel({ frame, turns, sample, live }: { frame: VisionFrame | null; turns: TranscriptTurn[]; sample: AudioSample | null; live: boolean }) {
  const [settings, setSettings] = useState(DEFAULT_COACHING);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [alerts, setAlerts] = useState<CoachingAlert[]>([]);
  const last = useRef<Record<string, number>>({});
  const since = useRef<number | null>(null);
  const condition = useRef<{ key: string; since: number } | null>(null);
  const metrics = transcriptMetrics(turns);
  const latestAnswer = turns.at(-1)?.role === "user" ? turns.at(-1)?.text.trim().split(/\s+/).length ?? 0 : 0;
  useEffect(() => {
    if (!live || !enabled) { condition.current = null; return; }
    const now = performance.now();
    since.current ??= now;
    let key = "", text = "";
    if (sample && !sample.muted && sample.peak >= 0.98) { key = "clipping"; text = "Microphone audio is clipping. Move slightly farther from the microphone."; }
    else if (liveTip(frame)) { key = "camera"; text = liveTip(frame) ?? ""; }
    else if (metrics.pace !== null && metrics.pace > settings.fastWpm) { key = "pace"; text = "You are speaking quickly. Pause between your key points."; }
    else if (latestAnswer > settings.longAnswerWords) { key = "length"; text = "Your answer is becoming lengthy. Summarise the main point and result."; }
    if (!key) { condition.current = null; return; }
    if (condition.current?.key !== key) condition.current = { key, since: now };
    if (now - condition.current.since < 3000 || !shouldAlert(last.current[key], now, settings.cooldownSeconds)) return;
    last.current[key] = now;
    setAlerts((prev) => [{ key, text, t_s: Math.round((now - (since.current ?? now)) / 1000) }, ...prev].slice(0, 30));
  }, [frame, sample, turns, live, enabled, settings, metrics.pace, latestAnswer]);
  const orientation = frame?.faceVisible ? `${Math.round(frame.yaw)}° yaw · ${Math.round(frame.pitch)}° pitch` : "Unavailable";
  return <section className="mt-4 border-t pt-4">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Advanced observations</h3><Button size="sm" variant="ghost" onClick={() => setSettingsOpen((v) => !v)}>Alert settings</Button></div>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">{[
      ["Head orientation", orientation],
      ["Blink estimate", frame?.blinkRate != null ? `${frame.blinkRate}/min · approximate` : "Needs 60 seconds · optional"],
      ["Hands in frame", frame?.handsVisible != null ? `${frame.handsVisible} wrists visible · no gesture score` : "Unavailable"],
      ["Mic signal", sample && !sample.muted ? `${Math.round(sample.rms * 1000) / 10}% RMS` : "Not measured / muted"],
      ["Audio peaks", sample && !sample.muted ? sample.peak >= 0.98 ? "Clipping detected" : "Below clipping threshold" : "Unavailable"],
      ["Voice intelligibility", "Not measured live"],
    ].map(([label, value]) => <div key={label} className="border-b pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
    <div className="mt-3"><p className="text-xs text-muted-foreground">Microphone signal · browser estimate</p><div className="mt-2 flex h-4 gap-1" aria-label="Microphone signal level">{Array.from({ length: 24 }, (_, i) => <span key={i} className={`h-full flex-1 rounded-sm transition-colors ${sample && !sample.muted && i < Math.min(24, sample.rms * 180) ? "bg-success" : "bg-muted"}`} />)}</div></div>
    {settingsOpen && <div className="mt-4 space-y-3 border-y py-3 text-xs"><label className="flex items-center justify-between gap-2">Coaching alerts<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /></label><label className="grid gap-1">Alert cooldown: {settings.cooldownSeconds}s<input aria-label="Alert cooldown" type="range" min={15} max={90} step={5} value={settings.cooldownSeconds} onChange={(e) => setSettings((s) => ({ ...s, cooldownSeconds: Number(e.target.value) }))} /></label><label className="grid gap-1">Fast speech threshold: {settings.fastWpm} wpm<input aria-label="Fast speech threshold" type="range" min={140} max={220} step={10} value={settings.fastWpm} onChange={(e) => setSettings((s) => ({ ...s, fastWpm: Number(e.target.value) }))} /></label><label className="grid gap-1">Long answer: {settings.longAnswerWords} words<input aria-label="Long answer threshold" type="range" min={100} max={300} step={20} value={settings.longAnswerWords} onChange={(e) => setSettings((s) => ({ ...s, longAnswerWords: Number(e.target.value) }))} /></label></div>}
    <h3 className="mt-4 text-sm font-bold">Coaching timeline</h3>
    {!alerts.length && <p className="mt-2 text-xs text-muted-foreground">No persistent observations yet.</p>}
    <ol className="mt-2 space-y-3">{alerts.map((a, i) => <li key={`${a.key}-${a.t_s}-${i}`} className="border-l-2 border-accent pl-3 text-xs"><span className="font-bold text-primary">{Math.floor(a.t_s / 60)}:{String(a.t_s % 60).padStart(2, "0")}</span><p className="mt-1">{a.text}</p></li>)}</ol>
  </section>;
}