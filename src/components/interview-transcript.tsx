import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TranscriptTurn } from "@/lib/interview-metrics";

export function InterviewTranscript({ turns, live }: { turns: TranscriptTurn[]; live: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(live);
  const [follow, setFollow] = useState(live);
  const [filter, setFilter] = useState("all");
  const visible = turns.filter((t) => filter === "all" || t.role === filter);
  useEffect(() => {
    const el = viewport.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
  }, [turns, filter]);
  function jump() {
    following.current = true;
    setFollow(true);
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight;
  }
  return <section aria-label="Interview transcript" className="flex h-full min-h-0 flex-col bg-card">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"><div><h2 className="font-bold">Full transcript</h2><p className="text-xs text-muted-foreground">{turns.length} turns · {live ? "Live captions" : "Conversation history"}</p></div><Button size="sm" variant="outline" onClick={jump}>{live && follow ? "Following live" : "Jump to latest"}</Button></div>
    <div role="group" aria-label="Transcript speaker filter" className="flex shrink-0 gap-2 border-b px-4 py-2">{[{ key: "all", label: "Everyone" }, { key: "assistant", label: "Aria" }, { key: "user", label: "You" }].map((f) => <Button key={f.key} variant={filter === f.key ? "secondary" : "ghost"} size="sm" aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); following.current = true; setFollow(true); }}>{f.label}</Button>)}</div>
    <div ref={viewport} role="region" aria-label="Transcript messages" tabIndex={0} onScroll={(e) => { const el = e.currentTarget; const next = el.scrollHeight - el.scrollTop - el.clientHeight < 48; following.current = next; setFollow(next); }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {!visible.length && <p className="py-6 text-sm text-muted-foreground">{turns.length ? "No messages from this speaker yet." : "Your conversation will appear here when the interview begins."}</p>}
      <div className="space-y-4">{visible.map((t, i) => <article key={`${filter}-${i}`} className={`border-l-2 pl-3 ${t.role === "assistant" ? "border-primary" : "border-accent"}`}><div className="mb-1 flex items-center justify-between gap-3"><span className={`text-xs font-bold ${t.role === "assistant" ? "text-primary" : "text-foreground"}`}>{t.role === "assistant" ? "Aria · Interviewer" : "You · Candidate"}</span>{t.start_ms > 0 && <time className="text-xs tabular-nums text-muted-foreground">{Math.floor(t.start_ms / 60000)}:{String(Math.floor(t.start_ms / 1000) % 60).padStart(2, "0")}</time>}</div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{t.text}</p></article>)}</div>
    </div>
  </section>;
}