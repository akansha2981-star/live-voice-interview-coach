import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { StudentPageHeading } from "@/components/student-page-heading";
import { Input } from "@/components/ui/input";
import { filterTab, previewText, readingMinutes, sortForFeed, type GkTab } from "@/lib/gk";
import { useGkArticles, useGkCategories, useGkProgress, useGkProgressMutation } from "@/lib/gk-queries";
import { safeUrl } from "@/lib/prep";

export const Route = createFileRoute("/_authenticated/gk/")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "GK Hub — MBA Compass" }, { name: "description", content: "Daily current affairs and general knowledge prepared for MBA interviews." }, { property: "og:title", content: "GK Hub — MBA Compass" }, { property: "og:description", content: "Current affairs with interview angles, questions and vocabulary." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GkFeed,
});

const TABS: { key: GkTab; label: string }[] = [{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, { key: "read", label: "Read" }, { key: "saved", label: "Saved" }];

function GkFeed() {
  const cats = useGkCategories(); const arts = useGkArticles(); const prog = useGkProgress(); const setProgress = useGkProgressMutation();
  const [tab, setTab] = useState<GkTab>("all"); const [cat, setCat] = useState<string>(""); const [q, setQ] = useState("");
  const readIds = useMemo(() => new Set((prog.data ?? []).filter((p) => p.is_read).map((p) => p.article_id)), [prog.data]);
  const savedIds = useMemo(() => new Set((prog.data ?? []).filter((p) => p.is_saved).map((p) => p.article_id)), [prog.data]);
  const catMap = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c])), [cats.data]);
  const all = arts.data ?? [];
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = all.filter((a) => (!cat || a.category_id === cat) && (!term || [a.title, a.summary_english, a.subcategory, ...(a.tags ?? [])].join(" ").toLowerCase().includes(term)));
    return sortForFeed(filterTab(base, tab, readIds, savedIds), readIds);
  }, [all, cat, q, tab, readIds, savedIds]);
  const readCount = all.filter((a) => readIds.has(a.id)).length;
  const pct = all.length ? Math.round((readCount / all.length) * 100) : 0;

  async function toggleSave(id: string) {
    try { await setProgress(id, { is_saved: !savedIds.has(id) }); toast.success(savedIds.has(id) ? "Removed from saved" : "Saved for later"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
  }

  return <div className="mx-auto grid w-full max-w-6xl gap-6">
    <StudentPageHeading eyebrow="My prep material" title="GK Hub" description="Current affairs explained for MBA interviews — in English, हिंदी or Hinglish, with interview angles and practice questions." />

    <section className="grid gap-3 sm:grid-cols-4">
      {[["Articles", all.length], ["Read", readCount], ["Unread", all.length - readCount], ["Saved", savedIds.size]].map(([l, v]) => <div key={l} className="section-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-3xl font-bold tabular-nums">{v}</p></div>)}
      <div className="section-card p-4 sm:col-span-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold">Reading progress</span><span className="tabular-nums text-muted-foreground">{pct}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} /></div></div>
    </section>

    <section className="section-card grid gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"}`}>{t.label}</button>)}
        <Input className="ml-auto w-full sm:w-64" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search articles" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCat("")} className={`rounded-md border px-3 py-1 text-xs font-semibold ${!cat ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>All categories</button>
        {(cats.data ?? []).filter((c) => c.is_active).map((c) => <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-md border px-3 py-1 text-xs font-semibold ${cat === c.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>{c.name}</button>)}
      </div>
    </section>

    {arts.error && <p className="text-sm text-destructive">Could not load articles.</p>}
    {arts.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !list.length ? <p className="section-card p-8 text-center text-sm text-muted-foreground">{all.length ? "No articles match these filters." : "No articles published yet. Check back soon."}</p> :
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => { const c = a.category_id ? catMap.get(a.category_id) : undefined; const read = readIds.has(a.id); const img = safeUrl(a.cover_image);
          return <article key={a.id} className={`section-card animate-reveal flex flex-col overflow-hidden ${read ? "opacity-80" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            {img ? <img src={img} alt="" loading="lazy" className="h-36 w-full object-cover" /> : <div className="flex h-20 items-center bg-secondary px-4 text-2xl font-bold text-primary">{c?.mark ?? "GK"}</div>}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold text-primary">{c?.name ?? "General"}</span><span className="text-muted-foreground">· {readingMinutes(a.summary_english, a.detailed_content)} min</span>{read ? <span className="ml-auto rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">Read</span> : <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 font-semibold">New</span>}</div>
              <h2 className="text-lg font-bold leading-snug">{a.title}</h2>
              <p className="text-sm text-muted-foreground">{previewText(a.summary_english ?? a.detailed_content ?? "")}</p>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <Link to="/gk/$slug" params={{ slug: a.slug }} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Read article</Link>
                <button type="button" onClick={() => toggleSave(a.id)} className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-muted">{savedIds.has(a.id) ? "Saved" : "Save for later"}</button>
                <span className="ml-auto text-xs text-muted-foreground">{a.published_at ? new Date(a.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
              </div>
            </div>
          </article>; })}
      </div>}
  </div>;
}
