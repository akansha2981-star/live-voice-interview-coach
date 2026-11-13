import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readPrepChunk } from "@/lib/prep-reader.functions";
import { MARK_COLORS, MARK_COLOR_LABEL, ZOOM_STEP, base64ToBytes, clampZoom, isBlockedShortcut, xorBytes, type MarkColor } from "@/lib/prep-reader";
import { prepByCategory } from "@/lib/prep";
import { SecurePdfReader, type ReaderHandle, type ReaderMark } from "@/components/secure-pdf-reader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/prep/read/$id")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Reading — MBA Compass Prep Material" }, { name: "description", content: "Read, zoom, mark and take notes on MBA Compass prep material inside your dashboard." }, { name: "robots", content: "noindex" }, { property: "og:title", content: "Prep material reader — MBA Compass" }, { property: "og:description", content: "Read, zoom, mark and take notes on MBA Compass prep material." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReaderPage,
});

function ReaderPage() {
  const { id } = Route.useParams();
  const read = useServerFn(readPrepChunk);
  const qc = useQueryClient();
  const reader = useRef<ReaderHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const { data: res } = useQuery({ queryKey: ["prep-resource", id], queryFn: async () => {
    const { data, error } = await supabase.from("resources").select("id, title, category, description, instructions").eq("id", id).maybeSingle();
    if (error) throw error; return data;
  } });
  const section = res ? prepByCategory(res.category) : undefined;

  // Load masked chunks into memory only — no file, no blob URL.
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [viewer, setViewer] = useState("");
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        let offset = 0; let buf: Uint8Array | null = null; let total = 1;
        do {
          const r = await read({ data: { id, offset } });
          if (stop) return;
          if (!buf) { buf = new Uint8Array(r.total); total = r.total; if (r.viewer) setViewer(r.viewer); }
          const part = xorBytes(base64ToBytes(r.chunk), base64ToBytes(r.key));
          if (!part.length) break;
          buf.set(part, offset); offset += part.length;
          setProgress(Math.round((offset / total) * 100));
        } while (offset < total);
        if (!stop && buf) setBytes(buf);
      } catch (e) { if (!stop) setLoadError(e instanceof Error ? e.message : "Could not open this document."); }
    })();
    return () => { stop = true; };
  }, [id, read]);

  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [marking, setMarking] = useState(false);
  const [color, setColor] = useState<MarkColor>("amber");
  const [veiled, setVeiled] = useState(false);
  const [focusMark, setFocusMark] = useState<string | null>(null);
  const [panel, setPanel] = useState<"notes" | "marks">("notes");

  const autoFit = useRef(true);
  const fitWidth = useCallback(() => {
    const w = scroller.current?.clientWidth; const first = sizes[0];
    if (w && first) { autoFit.current = true; setZoom(clampZoom((w - 32) / first.w)); }
  }, [sizes]);
  const zoomBy = (d: number) => { autoFit.current = false; setZoom((z) => clampZoom(z + d)); };
  useEffect(() => {
    const el = scroller.current; if (!el || !sizes.length) return;
    const ro = new ResizeObserver(() => { if (autoFit.current) fitWidth(); });
    ro.observe(el); return () => ro.disconnect();
  }, [sizes.length, fitWidth]);
  const onPages = useCallback((s: { w: number; h: number }[]) => setSizes(s), []);
  useEffect(() => { if (sizes.length) fitWidth(); }, [sizes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deterrents: no right-click, drag, copy, save or print; veil when the window loses focus.
  useEffect(() => {
    const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA"].includes(t.tagName));
    const key = (e: KeyboardEvent) => {
      if (!isBlockedShortcut(e, editable(e.target))) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key.toLowerCase() === "printscreen") { setVeiled(true); void navigator.clipboard?.writeText("").catch(() => {}); window.setTimeout(() => setVeiled(false), 1500); }
      toast.message("Saving, printing and copying are turned off for prep material.");
    };
    const blockIfReader = (e: Event) => { if (!editable(e.target)) e.preventDefault(); };
    const hide = () => setVeiled(true); const show = () => setVeiled(false);
    const vis = () => setVeiled(document.visibilityState !== "visible");
    const beforePrint = () => setVeiled(true);
    window.addEventListener("keydown", key, true); window.addEventListener("keyup", key, true);
    document.addEventListener("contextmenu", blockIfReader); document.addEventListener("copy", blockIfReader); document.addEventListener("cut", blockIfReader); document.addEventListener("dragstart", blockIfReader);
    window.addEventListener("blur", hide); window.addEventListener("focus", show); document.addEventListener("visibilitychange", vis); window.addEventListener("beforeprint", beforePrint); window.addEventListener("afterprint", show);
    return () => {
      window.removeEventListener("keydown", key, true); window.removeEventListener("keyup", key, true);
      document.removeEventListener("contextmenu", blockIfReader); document.removeEventListener("copy", blockIfReader); document.removeEventListener("cut", blockIfReader); document.removeEventListener("dragstart", blockIfReader);
      window.removeEventListener("blur", hide); window.removeEventListener("focus", show); document.removeEventListener("visibilitychange", vis); window.removeEventListener("beforeprint", beforePrint); window.removeEventListener("afterprint", show);
    };
  }, []);

  // Marks
  const marksKey = ["prep-marks", id];
  const { data: marks = [] } = useQuery({ queryKey: marksKey, queryFn: async () => {
    const { data, error } = await supabase.from("resource_highlights").select("id, page, x, y, w, h, color, label").eq("resource_id", id).order("page").order("y");
    if (error) throw error; return (data ?? []) as ReaderMark[];
  } });
  async function addMark(b: { page: number; x: number; y: number; w: number; h: number }) {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { data, error } = await supabase.from("resource_highlights").insert({ ...b, resource_id: id, user_id: u.user.id, color }).select("id, page, x, y, w, h, color, label").single();
    if (error) return toast.error("Could not save the mark.");
    qc.setQueryData<ReaderMark[]>(marksKey, (old = []) => [...old, data as ReaderMark].sort((a, z) => a.page - z.page || a.y - z.y));
    setPanel("marks"); toast.success(`Marked on page ${b.page}`);
  }
  async function updateLabel(m: ReaderMark, label: string) {
    if (label === m.label) return;
    const { error } = await supabase.from("resource_highlights").update({ label: label.slice(0, 300) }).eq("id", m.id);
    if (error) return toast.error("Could not save the label.");
    qc.setQueryData<ReaderMark[]>(marksKey, (old = []) => old.map((x) => x.id === m.id ? { ...x, label } : x));
  }
  async function removeMark(m: ReaderMark) {
    const { error } = await supabase.from("resource_highlights").delete().eq("id", m.id);
    if (error) return toast.error("Could not remove the mark.");
    qc.setQueryData<ReaderMark[]>(marksKey, (old = []) => old.filter((x) => x.id !== m.id));
  }

  // Notes (autosaved)
  const { data: savedNote, isFetched: noteLoaded } = useQuery({ queryKey: ["prep-note", id], queryFn: async () => {
    const { data, error } = await supabase.from("resource_notes").select("body, updated_at").eq("resource_id", id).maybeSingle();
    if (error) throw error; return data;
  } });
  const [note, setNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydrated = useRef(false);
  useEffect(() => { if (noteLoaded && !hydrated.current) { hydrated.current = true; setNote(savedNote?.body ?? ""); } }, [noteLoaded, savedNote]);
  useEffect(() => {
    if (!hydrated.current || note === (savedNote?.body ?? "")) return;
    setNoteState("saving");
    const t = window.setTimeout(async () => {
      const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
      const { error } = await supabase.from("resource_notes").upsert({ user_id: u.user.id, resource_id: id, body: note, updated_at: new Date().toISOString() });
      if (error) { setNoteState("error"); return; }
      qc.setQueryData(["prep-note", id], { body: note, updated_at: new Date().toISOString() }); setNoteState("saved");
    }, 800);
    return () => window.clearTimeout(t);
  }, [note]); // eslint-disable-line react-hooks/exhaustive-deps

  const watermark = useMemo(() => `${viewer || "MBA Compass"} · ${new Date().toLocaleDateString([], { dateStyle: "medium" })} · MBA Compass`, [viewer]);
  const pages = sizes.length;

  return <div className="secure-reader grid gap-4" onCopy={(e) => { if (!(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) e.preventDefault(); }}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Link to="/prep/$section" params={{ section: section?.slug ?? "sops" }} className="text-sm font-semibold text-primary hover:underline">← Back to {section?.label ?? "prep material"}</Link>
        <h1 className="mt-1 truncate text-2xl font-bold">{res?.title ?? "Loading…"}</h1>
        <p className="text-xs text-muted-foreground">Protected reading · this document can only be read inside your dashboard</p>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="reader-shell" aria-label="Document">
        <div className="reader-toolbar" role="toolbar" aria-label="Reader controls">
          <div className="reader-group">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => reader.current?.goTo(page - 1)} aria-label="Previous page">‹</Button>
            <span className="reader-count">Page <strong>{pages ? page : "–"}</strong> of {pages || "–"}</span>
            <Button size="sm" variant="ghost" disabled={!pages || page >= pages} onClick={() => reader.current?.goTo(page + 1)} aria-label="Next page">›</Button>
          </div>
          <div className="reader-group">
            <Button size="sm" variant="ghost" onClick={() => zoomBy(-ZOOM_STEP)} aria-label="Zoom out">−</Button>
            <span className="reader-count w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="ghost" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in">+</Button>
            <Button size="sm" variant="outline" onClick={fitWidth}>Fit width</Button>
          </div>
          <div className="reader-group">
            <Button size="sm" variant={marking ? "default" : "outline"} onClick={() => setMarking((m) => !m)} aria-pressed={marking}>{marking ? "Marking on — drag on page" : "Mark important"}</Button>
            {marking && MARK_COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} className={`reader-swatch reader-swatch-${c} ${color === c ? "is-active" : ""}`}>{MARK_COLOR_LABEL[c]}</button>)}
          </div>
        </div>
        <div ref={scroller} className={`reader-scroll ${marking ? "is-marking" : ""}`}>
          {loadError ? <div className="reader-state"><p className="font-semibold">Could not open this document</p><p className="text-sm text-muted-foreground">{loadError}</p></div>
            : !bytes ? <div className="reader-state"><span className="reader-spinner" aria-hidden /><p className="text-sm font-semibold">Opening securely… {progress}%</p><div className="reader-progress"><span style={{ width: `${progress}%` }} /></div></div>
            : <SecurePdfReader ref={reader} bytes={bytes} zoom={zoom} marking={marking} marks={marks} watermark={watermark} veiled={veiled} onPages={onPages} onPageChange={setPage} onMark={addMark} focusMark={focusMark} />}
          {veiled && bytes && <div className="reader-veil-note">Return to this window to keep reading</div>}
        </div>
      </section>

      <aside className="reader-side" aria-label="Your notes and marks">
        <div className="reader-tabs" role="tablist">
          <button role="tab" aria-selected={panel === "notes"} className={panel === "notes" ? "is-active" : ""} onClick={() => setPanel("notes")}>My notes</button>
          <button role="tab" aria-selected={panel === "marks"} className={panel === "marks" ? "is-active" : ""} onClick={() => setPanel("marks")}>Marked <span className="reader-badge">{marks.length}</span></button>
        </div>
        {panel === "notes" ? <div className="grid gap-2 p-4">
          <p className="student-eyebrow">Private to you</p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 20000))} placeholder="Write key points, questions to ask, or how you'd use this in your interview…" className="min-h-[340px] resize-y text-sm leading-relaxed" disabled={!noteLoaded} aria-label="Notes for this document" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>{noteState === "saving" ? "Saving…" : noteState === "saved" ? "Saved" : noteState === "error" ? "Could not save — keep typing to retry" : savedNote?.updated_at ? `Last saved ${new Date(savedNote.updated_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Notes save automatically"}</span><span>{note.length.toLocaleString()} / 20,000</span></div>
          <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setNote((n) => `${n}${n && !n.endsWith("\n") ? "\n" : ""}Page ${page}: `)}>Add note for page {page}</Button>
        </div> : <div className="grid gap-2 p-4">
          <p className="text-xs text-muted-foreground">Turn on <strong>Mark important</strong>, then drag across any part of a page to mark it.</p>
          {marks.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No marks yet.</p> :
            <ul className="grid gap-2">{marks.map((m) => <li key={m.id} className={`reader-mark-item reader-mark-item-${m.color}`}>
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="text-left text-sm font-bold hover:underline" onClick={() => { setFocusMark(null); window.setTimeout(() => setFocusMark(m.id), 0); }}>Page {m.page} · {MARK_COLOR_LABEL[m.color]}</button>
                <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-destructive" onClick={() => removeMark(m)}>Remove</button>
              </div>
              <Input defaultValue={m.label} maxLength={300} placeholder="Why is this important?" className="mt-2 h-8 text-xs" onBlur={(e) => updateLabel(m, e.target.value)} />
            </li>)}</ul>}
        </div>}
      </aside>
    </div>
  </div>;
}
