import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadResource } from "@/lib/admin.functions";
import { PREP_SECTIONS, prepBySlug, safeUrl } from "@/lib/prep";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/prep/$section")({
  beforeLoad: ({ params }) => { if (!prepBySlug(params.section)) throw notFound(); },
  head: ({ params }) => {
    const s = prepBySlug(params.section); const t = s ? s.label : "Prep material";
    return { meta: [{ title: `${t} — MBA Compass Prep Material` }, { name: "description", content: s?.blurb ?? "MBA Compass preparation material." }, { property: "og:title", content: `${t} — MBA Compass` }, { property: "og:description", content: s?.blurb ?? "MBA Compass preparation material." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: PrepPage,
});

function PrepPage() {
  const { section } = Route.useParams();
  const s = prepBySlug(section)!;
  const download = useServerFn(downloadResource); const [busy, setBusy] = useState<string | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["prep", s.category], queryFn: async () => {
    let q = supabase.from("resources").select("id, title, description, instructions, category, banner_path, pdf_path, event_at, registration_url").eq("published", true).eq("category", s.category);
    q = s.kind === "event" ? q.order("event_at", { ascending: true, nullsFirst: false }) : q.order("sort_order").order("created_at");
    const { data, error } = await q; if (error) throw error;
    const paths = (data ?? []).map((r) => r.banner_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabase.storage.from("resources").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urls = new Map(signed.map((x) => [x.path, x.signedUrl]));
    return (data ?? []).map((r) => ({ ...r, banner: r.banner_path ? urls.get(r.banner_path) ?? null : null }));
  } });
  async function get(id: string) {
    setBusy(id);
    try { const { url } = await download({ data: { id } }); window.location.assign(url); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Download failed"); } finally { setBusy(null); }
  }
  return <div className="grid gap-6">
    <section className="animate-reveal section-card p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">My prep material</p><h1 className="mt-1 text-3xl font-bold">{s.label}</h1><p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-2">{PREP_SECTIONS.map((x) => <Link key={x.slug} to="/prep/$section" params={{ section: x.slug }} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${x.slug === s.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>{x.label}</Link>)}</div>
    </section>
    {error && <p className="text-sm text-destructive">Could not load material.</p>}
    {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="section-card p-8 text-center text-sm text-muted-foreground">Nothing published here yet. Check back soon.</p> :
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.map((r, i) => {
        const link = safeUrl(r.registration_url); const when = r.event_at ? new Date(r.event_at) : null; const past = when ? when.getTime() < Date.now() : false;
        return <article key={r.id} style={{ "--i": i } as React.CSSProperties} className="animate-reveal card-lift section-card flex flex-col overflow-hidden">
          {r.banner ? <img src={r.banner} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-primary to-sky text-2xl font-bold text-primary-foreground">{s.mark}</div>}
          <div className="flex flex-1 flex-col gap-2 p-4">
            {when && <p className={`text-xs font-bold uppercase tracking-wide ${past ? "text-muted-foreground" : "text-primary"}`}>{when.toLocaleDateString([], { dateStyle: "medium" })} · {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{past ? " · Completed" : ""}</p>}
            <h2 className="text-lg font-bold">{r.title}</h2>
            {r.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{r.description}</p>}
            {r.instructions && <p className="rounded-md bg-secondary/60 p-2 text-xs"><strong>How to use: </strong>{r.instructions}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {s.kind === "event" ? (link && !past ? <Button asChild className="flex-1"><a href={link} target="_blank" rel="noopener noreferrer">Register now</a></Button> : <Button disabled className="flex-1">{past ? "Event ended" : "Registration soon"}</Button>) : null}
              {r.pdf_path && <Button variant={s.kind === "event" ? "outline" : "default"} className="flex-1" disabled={busy === r.id} onClick={() => get(r.id)}>{busy === r.id ? "Preparing…" : "Download document"}</Button>}
            </div>
          </div>
        </article>;
      })}</div>}
  </div>;
}
