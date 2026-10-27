import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { GkRichText } from "@/components/gk-rich-text";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cleanList, effectiveStatus, slugify, type GkStatus } from "@/lib/gk";
import { gkKeys, useGkArticles, useGkCategories, type GkArticle } from "@/lib/gk-queries";
import { safeUrl } from "@/lib/prep";

export const Route = createFileRoute("/admin/gk")({ staticData: { sitemap: false }, component: AdminGk });

type Form = { id?: string; title: string; slug: string; category_id: string; subcategory: string; cover_image: string; author: string; tags: string; summary_english: string; summary_hindi: string; summary_hinglish: string; detailed_content: string; why_this_matters: string; facts: string; angles: string; questions: string; vocab: string; status: GkStatus; scheduled_at: string };
const blank: Form = { title: "", slug: "", category_id: "", subcategory: "", cover_image: "", author: "MBA Compass", tags: "", summary_english: "", summary_hindi: "", summary_hinglish: "", detailed_content: "", why_this_matters: "", facts: "", angles: "", questions: "", vocab: "", status: "draft", scheduled_at: "" };

const split = (text: string) => text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.some(Boolean));
const join = (rows: (string | undefined)[][]) => rows.map((r) => r.map((x) => x ?? "").join(" | ").replace(/( \| )+$/, "")).join("\n");
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function fromArticle(a: GkArticle): Form {
  return { id: a.id, title: a.title, slug: a.slug, category_id: a.category_id ?? "", subcategory: a.subcategory ?? "", cover_image: a.cover_image ?? "", author: a.author ?? "", tags: (a.tags ?? []).join(", "), summary_english: a.summary_english ?? "", summary_hindi: a.summary_hindi ?? "", summary_hinglish: a.summary_hinglish ?? "", detailed_content: a.detailed_content ?? "", why_this_matters: a.why_this_matters ?? "",
    facts: join((a.facts ?? []).map((f) => [f.heading, f.content])), angles: join((a.interview_angles ?? []).map((g) => [g.heading, g.content, g.talking_point])), questions: join((a.interview_questions ?? []).map((q) => [q.question, q.answer, q.difficulty])), vocab: join((a.vocabulary ?? []).map((w) => [w.word, w.meaning, w.hindi_meaning, w.example])), status: a.status, scheduled_at: toLocal(a.scheduled_at) };
}

function AdminGk() {
  const staff = useStaff(); const qc = useQueryClient();
  const arts = useGkArticles(); const cats = useGkCategories();
  const stats = useQuery({ queryKey: ["gk", "analytics"], queryFn: async () => { const { data, error } = await supabase.rpc("gk_analytics"); if (error) throw error; return data ?? []; } });
  const [view, setView] = useState<GkStatus>("published");
  const [form, setForm] = useState<Form | null>(null); const [preview, setPreview] = useState(false); const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState("");
  const statMap = useMemo(() => new Map((stats.data ?? []).map((s: { article_id: string }) => [s.article_id, s as { views: number; unique_readers: number; completions: number; bookmarks: number }])), [stats.data]);
  const list = (arts.data ?? []).filter((a) => effectiveStatus(a.status, a.scheduled_at) === view);
  const counts = (s: GkStatus) => (arts.data ?? []).filter((a) => effectiveStatus(a.status, a.scheduled_at) === s).length;
  const totals = (stats.data ?? []).reduce((t: number[], s: { views: number; completions: number; bookmarks: number }) => [t[0] + Number(s.views), t[1] + Number(s.completions), t[2] + Number(s.bookmarks)], [0, 0, 0]);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.summary_english.trim()) return toast.error("Title and English summary are required.");
    if (form.cover_image.trim() && !safeUrl(form.cover_image)) return toast.error("Cover image must be a full https:// link.");
    if (form.status === "scheduled" && !form.scheduled_at) return toast.error("Pick a date and time to schedule.");
    setBusy(true);
    try {
      const row = {
        title: form.title.trim(), slug: slugify(form.slug || form.title) || crypto.randomUUID().slice(0, 8), category_id: form.category_id || null, subcategory: form.subcategory.trim() || null, cover_image: safeUrl(form.cover_image), author: form.author.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), summary_english: form.summary_english, summary_hindi: form.summary_hindi || null, summary_hinglish: form.summary_hinglish || null, detailed_content: form.detailed_content, why_this_matters: form.why_this_matters || null,
        facts: cleanList(split(form.facts).map(([heading, content]) => (content === undefined ? { heading: "", content: heading } : { heading, content })), ["content"]),
        interview_angles: cleanList(split(form.angles).map(([heading, content, talking_point]) => ({ heading, content: content ?? "", talking_point: talking_point ?? "" })), ["heading", "content"]),
        interview_questions: cleanList(split(form.questions).map(([question, answer, difficulty]) => ({ question, answer: answer ?? "", difficulty: difficulty ?? "" })), ["question", "answer"]),
        vocabulary: cleanList(split(form.vocab).map(([word, meaning, hindi_meaning, example]) => ({ word, meaning: meaning ?? "", hindi_meaning: hindi_meaning ?? "", example: example ?? "" })), ["word", "meaning"]),
        status: form.status, scheduled_at: form.status === "scheduled" ? new Date(form.scheduled_at).toISOString() : null,
      };
      const { error } = form.id ? await supabase.from("gk_articles").update(row).eq("id", form.id) : await supabase.from("gk_articles").insert({ ...row, created_by: staff.id });
      if (error) throw new Error(error.message.includes("slug") ? "Another article already uses this web address (slug)." : error.message);
      toast.success(form.id ? "Article updated" : "Article created"); setForm(null); setPreview(false); setView(effectiveStatus(row.status, row.scheduled_at));
      qc.invalidateQueries({ queryKey: gkKeys.articles });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }
  async function remove(a: GkArticle) {
    if (!confirm(`Delete "${a.title}"? Student reading history for it will also be removed.`)) return;
    const { error } = await supabase.from("gk_articles").delete().eq("id", a.id); if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: gkKeys.articles });
  }
  async function addCat() {
    const name = newCat.trim(); if (!name) return;
    const { error } = await supabase.from("gk_categories").insert({ name, slug: slugify(name), mark: name.slice(0, 2).toUpperCase(), display_order: (cats.data?.length ?? 0) + 1 });
    if (error) return toast.error(error.message); setNewCat(""); qc.invalidateQueries({ queryKey: gkKeys.cats });
  }
  async function toggleCat(id: string, is_active: boolean) {
    const { error } = await supabase.from("gk_categories").update({ is_active }).eq("id", id); if (error) return toast.error(error.message); qc.invalidateQueries({ queryKey: gkKeys.cats });
  }

  if (form) return <>
    <PageHeader title={form.id ? "Edit GK article" : "New GK article"} sub="Formatting: ## heading, - bullet, **bold**, ==highlight==, > callout, [link](https://…)"><Button variant="outline" onClick={() => setPreview((p) => !p)}>{preview ? "Back to editing" : "Preview"}</Button><Button variant="outline" onClick={() => { setForm(null); setPreview(false); }}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></PageHeader>
    {preview ? <Card title={form.title || "Untitled"} sub="Student view preview"><div className="grid gap-5">
      {safeUrl(form.cover_image) && <img src={safeUrl(form.cover_image) ?? ""} alt="" className="max-h-72 w-full rounded-lg object-cover" />}
      {[["English summary", form.summary_english], ["हिंदी", form.summary_hindi], ["Hinglish", form.summary_hinglish], ["Detailed analysis", form.detailed_content], ["Why this matters", form.why_this_matters]].filter(([, t]) => t.trim()).map(([l, t]) => <div key={l}><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{l}</p><GkRichText text={t} /></div>)}
      <p className="text-sm text-muted-foreground">{split(form.facts).length} facts · {split(form.angles).length} interview angles · {split(form.questions).length} questions · {split(form.vocab).length} vocabulary words</p>
    </div></Card> :
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Basics"><div className="grid gap-3">
        <Input placeholder="Title *" value={form.title} onChange={set("title")} />
        <Input placeholder="Web address (auto from title)" value={form.slug} onChange={set("slug")} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.category_id} onChange={set("category_id")}><option value="">Choose category</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Input placeholder="Sub-category (optional)" value={form.subcategory} onChange={set("subcategory")} />
        <Input placeholder="Cover image link https://… (optional)" value={form.cover_image} onChange={set("cover_image")} />
        <Input placeholder="Author" value={form.author} onChange={set("author")} />
        <Input placeholder="Tags, comma separated" value={form.tags} onChange={set("tags")} />
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.status} onChange={set("status")}><option value="draft">Draft</option><option value="published">Publish now</option><option value="scheduled">Schedule</option></select>
          {form.status === "scheduled" && <Input type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} />}
        </div>
      </div></Card>
      <Card title="Summaries"><div className="grid gap-3">
        <Textarea rows={5} placeholder="English summary *" value={form.summary_english} onChange={set("summary_english")} />
        <Textarea rows={5} placeholder="हिंदी सारांश" value={form.summary_hindi} onChange={set("summary_hindi")} />
        <Textarea rows={5} placeholder="Hinglish summary" value={form.summary_hinglish} onChange={set("summary_hinglish")} />
      </div></Card>
      <Card title="Article" className="lg:col-span-2"><div className="grid gap-3">
        <Textarea rows={10} placeholder="Detailed content" value={form.detailed_content} onChange={set("detailed_content")} />
        <Textarea rows={4} placeholder="Why this matters for MBA interviews" value={form.why_this_matters} onChange={set("why_this_matters")} />
      </div></Card>
      <Card title="Key facts" sub="One per line: Heading | fact"><Textarea rows={6} value={form.facts} onChange={set("facts")} /></Card>
      <Card title="Interview angles" sub="One per line: Heading | explanation | talking point"><Textarea rows={6} value={form.angles} onChange={set("angles")} /></Card>
      <Card title="PI questions" sub="One per line: Question | model answer | Easy/Moderate/Advanced"><Textarea rows={6} value={form.questions} onChange={set("questions")} /></Card>
      <Card title="Vocabulary" sub="One per line: Word | meaning | Hindi meaning | example"><Textarea rows={6} value={form.vocab} onChange={set("vocab")} /></Card>
    </div>}
  </>;

  return <>
    <PageHeader title="GK Management" sub="Write, schedule and track GK Hub articles.">{staff.canOperate && <Button onClick={() => setForm({ ...blank, category_id: cats.data?.[0]?.id ?? "" })}>New article</Button>}</PageHeader>
    <div className="grid gap-3 sm:grid-cols-4">
      {[["Articles", arts.data?.length ?? 0], ["Total views", totals[0]], ["Marked read", totals[1]], ["Saved", totals[2]]].map(([l, v]) => <div key={l} className="section-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p></div>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <Card title="Articles" actions={<div className="flex gap-1">{(["published", "scheduled", "draft"] as GkStatus[]).map((s) => <button key={s} type="button" onClick={() => setView(s)} className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${view === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s} ({counts(s)})</button>)}</div>}>
        {arts.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !list.length ? <p className="text-sm text-muted-foreground">No {view} articles.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Title</th><th>Category</th><th>{view === "scheduled" ? "Goes live" : "Date"}</th><th className="text-right">Views</th><th className="text-right">Readers</th><th className="text-right">Read</th><th className="text-right">Saved</th><th /></tr></thead>
            <tbody>{list.map((a) => { const s = statMap.get(a.id); return <tr key={a.id} className="border-b last:border-0">
              <td className="py-2 pr-2 font-semibold">{a.title}</td><td>{cats.data?.find((c) => c.id === a.category_id)?.name ?? "—"}</td>
              <td className="whitespace-nowrap">{new Date((view === "scheduled" ? a.scheduled_at : a.published_at) ?? a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: view === "scheduled" ? "short" : undefined })}</td>
              <td className="text-right tabular-nums">{s?.views ?? 0}</td><td className="text-right tabular-nums">{s?.unique_readers ?? 0}</td><td className="text-right tabular-nums">{s?.completions ?? 0}</td><td className="text-right tabular-nums">{s?.bookmarks ?? 0}</td>
              <td className="whitespace-nowrap text-right">{staff.canOperate && <><Button size="sm" variant="outline" onClick={() => setForm(fromArticle(a))}>Edit</Button> <Button size="sm" variant="ghost" onClick={() => remove(a)}>Delete</Button></>}</td>
            </tr>; })}</tbody></table></div>}
      </Card>
      <Card title="Categories" className="h-fit">
        <div className="grid gap-2">{(cats.data ?? []).map((c) => <div key={c.id} className="flex items-center justify-between gap-2 text-sm"><span className={c.is_active ? "font-semibold" : "text-muted-foreground line-through"}>{c.name}</span>{staff.canOperate && <button type="button" className="text-xs font-semibold text-primary" onClick={() => toggleCat(c.id, !c.is_active)}>{c.is_active ? "Hide" : "Show"}</button>}</div>)}</div>
        {staff.canOperate && <div className="mt-4 flex gap-2"><Input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><Button onClick={addCat}>Add</Button></div>}
      </Card>
    </div>
  </>;
}
