import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type React from "react";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { dragToBox, type MarkColor } from "@/lib/prep-reader";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void } };

export type ReaderMark = { id: string; page: number; x: number; y: number; w: number; h: number; color: MarkColor; label: string };
export type ReaderHandle = { goTo: (page: number) => void };

type Props = {
  bytes: Uint8Array;
  zoom: number;
  marking: boolean;
  marks: ReaderMark[];
  watermark: string;
  veiled: boolean;
  onPages: (sizes: { w: number; h: number }[]) => void;
  onPageChange: (page: number) => void;
  onMark: (box: { page: number; x: number; y: number; w: number; h: number }) => void;
  focusMark?: string | null;
};

/**
 * Canvas-only PDF reader: no text layer (nothing to select or copy), no file URL,
 * and every rendered page carries the reader's own watermark.
 */
export const SecurePdfReader = forwardRef<ReaderHandle, Props>(function SecurePdfReader(p, ref) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const pageEls = useRef(new Map<number, HTMLDivElement>());
  const { onPages, onPageChange } = p;

  useEffect(() => {
    let cancelled = false; let loaded: PdfDoc | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        // Copy so the worker transfer never detaches the caller's buffer.
        const task = pdfjs.getDocument({ data: p.bytes.slice(), isEvalSupported: false, enableXfa: false, disableAutoFetch: true });
        loaded = (await task.promise) as unknown as PdfDoc;
        if (cancelled) { void loaded.destroy(); return; }
        const s: { w: number; h: number }[] = [];
        for (let i = 1; i <= loaded.numPages; i++) {
          const vp = (await loaded.getPage(i)).getViewport({ scale: 1 });
          s.push({ w: vp.width, h: vp.height });
        }
        if (cancelled) return;
        setDoc(loaded); setSizes(s); onPages(s);
      } catch (e) {
        if (!cancelled) setFailed(e instanceof Error ? e.message : "This document could not be displayed.");
      }
    })();
    return () => { cancelled = true; if (loaded) void loaded.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.bytes]);

  useImperativeHandle(ref, () => ({ goTo: (page) => pageEls.current.get(page)?.scrollIntoView({ behavior: "smooth", block: "start" }) }), []);

  useEffect(() => {
    if (!sizes.length) return;
    const io = new IntersectionObserver((entries) => {
      const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) onPageChange(Number((best.target as HTMLElement).dataset.page));
    }, { threshold: [0.25, 0.5, 0.75] });
    pageEls.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sizes, onPageChange]);

  useEffect(() => {
    if (!p.focusMark) return;
    const m = p.marks.find((x) => x.id === p.focusMark);
    if (m) pageEls.current.get(m.page)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [p.focusMark, p.marks]);

  if (failed) return <div className="reader-state"><p className="font-semibold">This document could not be displayed.</p><p className="text-sm text-muted-foreground">{failed}</p></div>;
  if (!doc) return <div className="reader-state"><span className="reader-spinner" aria-hidden /><p className="text-sm text-muted-foreground">Preparing pages…</p></div>;

  return <div className={`reader-pages ${p.veiled ? "reader-veiled" : ""}`}>
    {sizes.map((s, i) => <ReaderPage key={i + 1} page={i + 1} doc={doc} size={s} zoom={p.zoom} marking={p.marking} watermark={p.watermark}
      marks={p.marks.filter((m) => m.page === i + 1)} focusMark={p.focusMark ?? null} onMark={p.onMark}
      register={(el) => { if (el) pageEls.current.set(i + 1, el); else pageEls.current.delete(i + 1); }} />)}
  </div>;
});

function ReaderPage({ page, doc, size, zoom, marking, marks, watermark, focusMark, onMark, register }: {
  page: number; doc: PdfDoc; size: { w: number; h: number }; zoom: number; marking: boolean; marks: ReaderMark[]; watermark: string; focusMark: string | null;
  onMark: Props["onMark"]; register: (el: HTMLDivElement | null) => void;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [near, setNear] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const width = Math.round(size.w * zoom), height = Math.round(size.h * zoom);

  const setWrap = useCallback((el: HTMLDivElement | null) => { wrap.current = el; register(el); }, [register]);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "900px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !canvas.current) return;
    let task: { promise: Promise<void>; cancel: () => void } | null = null; let stop = false;
    const t = window.setTimeout(async () => {
      const pg = await doc.getPage(page); if (stop || !canvas.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = pg.getViewport({ scale: zoom * dpr });
      const c = canvas.current; c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext("2d"); if (!ctx) return;
      task = pg.render({ canvasContext: ctx, viewport: vp });
      try { await task.promise; } catch { return; }
      if (!stop) drawWatermark(ctx, c.width, c.height, watermark, zoom * dpr);
    }, 120);
    return () => { stop = true; window.clearTimeout(t); task?.cancel(); };
  }, [near, zoom, doc, page, watermark]);

  // Free canvas memory for pages far away from the viewport.
  useEffect(() => { if (!near && canvas.current) { canvas.current.width = 0; canvas.current.height = 0; } }, [near]);

  function point(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  return <div ref={setWrap} data-page={page} className="reader-page" style={{ width, height }}>
    <canvas ref={canvas} className="reader-canvas" aria-label={`Page ${page}`} />
    <div className={`reader-overlay ${marking ? "is-marking" : ""}`}
      onPointerDown={(e) => { if (!marking) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = point(e); setDraft(null); }}
      onPointerMove={(e) => { if (!marking || !start.current) return; setDraft(dragToBox(start.current, point(e))); }}
      onPointerUp={(e) => { if (!marking || !start.current) return; const box = dragToBox(start.current, point(e)); start.current = null; setDraft(null); if (box) onMark({ page, ...box }); }}
      onPointerCancel={() => { start.current = null; setDraft(null); }}>
      {marks.map((m) => <span key={m.id} title={m.label || undefined} className={`reader-mark reader-mark-${m.color} ${focusMark === m.id ? "is-focused" : ""}`} style={box(m)} />)}
      {draft && <span className="reader-mark reader-mark-draft" style={box(draft)} />}
    </div>
    <span className="reader-page-no">{page}</span>
  </div>;
}

const box = (b: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, scale: number) {
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "gray";
  ctx.font = `600 ${Math.round(13 * scale)}px Calibri, Carlito, sans-serif`;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const step = 190 * scale, span = Math.hypot(w, h);
  for (let y = -span; y < span; y += step * 0.55) {
    for (let x = -span; x < span; x += step * 1.9) ctx.fillText(text, x + ((y / step) % 2) * step * 0.5, y);
  }
  ctx.restore();
}
