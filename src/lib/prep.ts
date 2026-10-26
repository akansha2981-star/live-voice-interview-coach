// Browser-safe prep-material section config. `category` is the value stored in resources.category.
export const PREP_SECTIONS = [
  { slug: "sops", category: "SOP", label: "Sample SOPs", mark: "SP", blurb: "Sample statements of purpose curated by MBA Compass.", kind: "document" },
  { slug: "gdpi", category: "GDPI Docket", label: "GDPI Dockets", mark: "GD", blurb: "Group discussion and personal interview dockets.", kind: "document" },
  { slug: "dossiers", category: "Domain Dossier", label: "Domain Dossiers", mark: "DD", blurb: "Domain knowledge dossiers for finance, marketing, operations and more.", kind: "document" },
  { slug: "masterclasses", category: "Masterclass", label: "Masterclasses & Workshops", mark: "MW", blurb: "Upcoming live masterclasses and workshops. Register using the link.", kind: "event" },
  { slug: "gk", category: "GK Hub", label: "GK Hub", mark: "GK", blurb: "General knowledge and current affairs material.", kind: "document" },
] as const;
export type PrepSection = (typeof PREP_SECTIONS)[number];
export const prepBySlug = (slug: string) => PREP_SECTIONS.find((s) => s.slug === slug);
export const prepByCategory = (c: string) => PREP_SECTIONS.find((s) => s.category === c);
export const isEventCategory = (c: string) => prepByCategory(c)?.kind === "event";

/** Only http(s) links are allowed for registration / announcement links. */
export function safeUrl(u: string | null | undefined) {
  if (!u) return null;
  try { const x = new URL(u.trim()); return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null; } catch { return null; }
}
