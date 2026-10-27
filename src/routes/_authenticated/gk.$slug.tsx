import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { GkRichText } from "@/components/gk-rich-text";
import { GK_LANGUAGES, readingMinutes, type GkLanguage } from "@/lib/gk";
import { recordGkView, useGkArticles, useGkCategories, useGkProgress, useGkProgressMutation } from "@/lib/gk-queries";
import { safeUrl } from "@/lib/prep";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/gk/$slug")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "GK article — MBA Compass" }, { name: "description", content: "Current affairs explained with interview angles and practice questions." }, { property: "og:title", content: "GK article — MBA Compass" }, { property: "og:description", content: "Read, practise and mark GK articles as read." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: GkArticlePage,
});

function GkArticlePage() {
  const { slug } = Route.useParams();
  const arts = useGkArticles(); const cats = useGkCategories(); const prog = useGkProgress(); const setProgress = useGkProgressMutation();
  const a = arts.data?.find((x) => x.slug === slug);
  const [lang, setLang] = useState<GkLanguage>("en");
  const [open, setOpen] = useState<number | null>(null);
  const p = prog.data?.find((x) => x.article_id === a?.id);

  useEffect(() => { if (a?.id) void recordGkView(a.id); }, [a?.id]);
  useEffect(() => { void supabase.auth.getSession().then(async ({ data }) => { const uid = data.session?.user.id; if (!uid) return; const { data: pr } = await supabase.from("profiles").select("gk_language").eq("id", uid).maybeSingle(); if (pr?.gk_language === "hi" || pr?.gk_language === "hinglish" || pr?.gk_language === "en") setLang(pr.gk_language); }); }, []);

  async function chooseLang(l: GkLanguage) {
    setLang(l);
    const { data } = await supabase.auth.getSession(); const uid = data.session?.user.id;
    if (uid) await supabase.from("profiles").update({ gk_language: l }).eq("id", uid);
  }
  async function update(patch: { is_read?: boolean; is_saved?: boolean }, msg: string) {
    if (!a) return; try { await setProgress(a.id, patch); toast.success(msg); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
  }

  if (arts.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!a) return <div className="section-card mx-auto max-w-xl p-8 text-center"><p className="font-semibold">This article is not available.</p><Link to="/gk" className="mt-3 inline-block text-sm font-semibold text-primary underline">Back to GK Hub</Link></div>;
  const cat = cats.data?.find((c) => c.id === a.category_id);
  const summary = lang === "hi" ? a.summary_hindi : lang === "hinglish" ? a.summary_hinglish : a.summary_english;
  const img = safeUrl(a.cover_image);

  return <article className="mx-auto grid w-full max-w-3xl gap-6 pb-10">
    <Link to="/gk" className="text-sm font-semibold text-primary">← GK Hub</Link>
    <header className="grid gap-3 animate-reveal">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{cat?.name ?? "General"}{a.subcategory ? ` · ${a.subcategory}` : ""}</p>
      <h1 className="text-3xl font-bold leading-tight md:text-4xl">{a.title}</h1>
      <p className="text-sm text-muted-foreground">{a.author ? `${a.author} · ` : ""}{a.published_at ? new Date(a.published_at).toLocaleDateString("en-IN", { dateStyle: "long" }) : ""} · {readingMinutes(a.summary_english, a.detailed_content)} min read</p>
      {img && <img src={img} alt="" className="max-h-80 w-full rounded-xl object-cover" />}
    </header>

    <section className="section-card p-5">
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Summary language">{GK_LANGUAGES.map((l) => <button key={l.key} role="tab" aria-selected={lang === l.key} type="button" onClick={() => void chooseLang(l.key)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === l.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>{l.label}</button>)}</div>
      {summary ? <GkRichText text={summary} /> : <p className="text-sm text-muted-foreground">Summary not available in this language yet.</p>}
    </section>

    {a.detailed_content && <Section title="Detailed analysis"><GkRichText text={a.detailed_content} /></Section>}
    {a.why_this_matters && <Section title="Why this matters for your interview"><GkRichText text={a.why_this_matters} /></Section>}
    {!!a.facts?.length && <Section title="Key facts"><ol className="grid gap-3">{a.facts.map((f, i) => <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">{i + 1}</span><div>{f.heading && <p className="font-semibold">{f.heading}</p>}<p className="text-sm">{f.content}</p></div></li>)}</ol></Section>}
    {!!a.interview_angles?.length && <Section title="Interview angles"><div className="grid gap-3">{a.interview_angles.map((g, i) => <div key={i} className="rounded-lg border-l-4 border-primary bg-muted/50 p-3"><p className="font-semibold">{g.heading}</p><p className="text-sm">{g.content}</p>{g.talking_point && <p className="mt-1 text-sm italic text-muted-foreground">Talking point: {g.talking_point}</p>}</div>)}</div></Section>}
    {!!a.interview_questions?.length && <Section title="Practice PI questions"><div className="grid gap-2">{a.interview_questions.map((qq, i) => <div key={i} className="rounded-lg border">
      <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-start gap-3 p-3 text-left"><span className="font-bold text-primary">Q{i + 1}</span><span className="flex-1 font-semibold">{qq.question}</span>{qq.difficulty && <span className="text-xs text-muted-foreground">{qq.difficulty}</span>}<span className="text-sm text-primary">{open === i ? "Hide" : "Show answer"}</span></button>
      {open === i && <div className="border-t bg-muted/40 p-3 text-sm animate-reveal"><GkRichText text={qq.answer} /></div>}
    </div>)}</div></Section>}
    {!!a.vocabulary?.length && <Section title="Vocabulary"><div className="grid gap-3 sm:grid-cols-2">{a.vocabulary.map((w, i) => <div key={i} className="rounded-lg bg-muted/50 p-3"><p className="font-bold">{w.word}{w.hindi_meaning && <span className="ml-2 font-normal text-muted-foreground">({w.hindi_meaning})</span>}</p><p className="text-sm">{w.meaning}</p>{w.example && <p className="mt-1 text-xs italic text-muted-foreground">{w.example}</p>}</div>)}</div></Section>}

    <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
      <button type="button" onClick={() => void update({ is_read: !p?.is_read }, p?.is_read ? "Marked as unread" : "Marked as read")} className={`rounded-md px-4 py-2 text-sm font-semibold ${p?.is_read ? "bg-success/15 text-success" : "bg-primary text-primary-foreground"}`}>{p?.is_read ? "Read ✓ — mark unread" : "Mark as read"}</button>
      <button type="button" onClick={() => void update({ is_saved: !p?.is_saved }, p?.is_saved ? "Removed from saved" : "Saved for later")} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">{p?.is_saved ? "Saved" : "Save for later"}</button>
    </div>
  </article>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="section-card animate-reveal p-5"><h2 className="mb-3 text-xl font-bold">{title}</h2>{children}</section>;
}
