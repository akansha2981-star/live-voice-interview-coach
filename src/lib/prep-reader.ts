// Browser-safe helpers for the secure in-dashboard prep-material reader.

/** Bytes sent per server round-trip. Small enough to stay well inside worker memory. */
export const READER_CHUNK_BYTES = 2 * 1024 * 1024;
/** Admin uploads are capped at 20 MB; anything bigger is refused. */
export const READER_MAX_BYTES = 25 * 1024 * 1024;
/** A student may open at most this many documents in the rolling window. */
export const READER_MAX_OPENS = 40;
export const READER_OPEN_WINDOW_MS = 10 * 60 * 1000;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export const MARK_COLORS = ["amber", "sky", "rose"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];
export const MARK_COLOR_LABEL: Record<MarkColor, string> = { amber: "Important", sky: "Revise", rose: "Doubt" };

export function clampZoom(z: number) {
  if (!Number.isFinite(z)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

/** Normalises a drag between two points (page fractions) into a box; null when it is too small to be deliberate. */
export function dragToBox(a: { x: number; y: number }, b: { x: number; y: number }) {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const x1 = c(Math.min(a.x, b.x)), x2 = c(Math.max(a.x, b.x));
  const y1 = c(Math.min(a.y, b.y)), y2 = c(Math.max(a.y, b.y));
  const w = x2 - x1, h = y2 - y1;
  if (w < 0.01 || h < 0.005) return null;
  return { x: x1, y: y1, w, h };
}

/** XOR mask applied to each chunk in transit so a saved network response is not a usable PDF. */
export function xorBytes(bytes: Uint8Array, key: Uint8Array) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ key[i % key.length];
  return out;
}

export function bytesToBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Parses "bytes 0-99/1234" into the total size. */
export function totalFromContentRange(h: string | null) {
  const m = h?.match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Keyboard shortcuts blocked while reading. Copy/select-all are allowed inside the notes box. */
export function isBlockedShortcut(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey?: boolean }, inEditable: boolean) {
  const k = e.key.toLowerCase();
  if (k === "printscreen") return true;
  if (!(e.ctrlKey || e.metaKey)) return false;
  if (k === "s" || k === "p") return true;
  if (e.shiftKey && (k === "i" || k === "j" || k === "c" || k === "s")) return true;
  if (!inEditable && (k === "c" || k === "a" || k === "x")) return true;
  return false;
}
