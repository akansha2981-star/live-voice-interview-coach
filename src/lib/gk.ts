// Browser-safe GK Hub helpers shared by the student reader and admin editor.
export type GkFact = { heading?: string; content: string };
export type GkAngle = { heading: string; content: string; talking_point?: string };
export type GkQuestion = { question: string; answer: string; difficulty?: "Easy" | "Moderate" | "Advanced" | "" };
export type GkWord = { word: string; meaning: string; hindi_meaning?: string; example?: string };
export type GkLanguage = "en" | "hi" | "hinglish";
export type GkStatus = "draft" | "published" | "scheduled";

export const GK_LANGUAGES: { key: GkLanguage; label: string }[] = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिंदी" },
  { key: "hinglish", label: "Hinglish" },
];

export const GK_COLORS = ["primary", "sky", "accent", "success", "destructive", "ink"] as const;

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export function readingMinutes(...texts: (string | null | undefined)[]) {
  const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function previewText(md: string, len = 160) {
  const t = md.replace(/[#*=>|`_-]+/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  return t.length > len ? `${t.slice(0, len).trimEnd()}…` : t;
}

type Sortable = { id: string; published_at: string | null; created_at?: string };
/** Unread first (newest → oldest), then read (newest → oldest). Read articles never disappear. */
export function sortForFeed<T extends Sortable>(items: T[], readIds: Set<string>) {
  const time = (a: T) => Date.parse(a.published_at ?? a.created_at ?? "") || 0;
  return items.slice().sort((a, b) => Number(readIds.has(a.id)) - Number(readIds.has(b.id)) || time(b) - time(a));
}

export type GkTab = "all" | "unread" | "read" | "saved";
export function filterTab<T extends Sortable>(items: T[], tab: GkTab, readIds: Set<string>, savedIds: Set<string>) {
  if (tab === "unread") return items.filter((a) => !readIds.has(a.id));
  if (tab === "read") return items.filter((a) => readIds.has(a.id));
  if (tab === "saved") return items.filter((a) => savedIds.has(a.id));
  return items;
}

/** Status shown to admins, treating past-due scheduled posts as live. */
export function effectiveStatus(status: GkStatus, scheduledAt: string | null, now = Date.now()): "draft" | "published" | "scheduled" {
  if (status === "scheduled" && scheduledAt && Date.parse(scheduledAt) <= now) return "published";
  return status;
}

export function cleanList<T extends Record<string, unknown>>(rows: T[], required: (keyof T)[]) {
  return rows.filter((r) => required.every((k) => String(r[k] ?? "").trim())).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) as T);
}
