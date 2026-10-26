import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadResource } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "SOP & Resources — MBA Compass AI Interview" }, { name: "description", content: "Sample SOPs and interview preparation resources from MBA Compass." }, { property: "og:title", content: "SOP & Resources — MBA Compass" }, { property: "og:description", content: "Download sample SOPs and preparation guides." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const download = useServerFn(downloadResource); const [busy, setBusy] = useState<string | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["resources"], queryFn: async () => {
    const { data, error } = await supabase.from("resources").select("id, title, description, instructions, category, banner_path").eq("published", true).order("sort_order").order("created_at");
    if (error) throw error;
    const paths = (data ?? []).map((r) => r.banner_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabase.storage.from("resources").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
    return (data ?? []).map((r) => ({ ...r, banner: r.banner_path ? urls.get(r.banner_path) ?? null : null }));
  } });
  async function get(id: string) {
    setBusy(id);
    try { const { url } = await download({ data: { id } }); window.location.assign(url); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Download failed"); } finally { setBusy(null); }
  }
  return <div className="grid gap-6">
    <section className="animate-reveal section-card p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">SOP & Resources</p><h1 className="mt-1 text-3xl font-bold">Preparation library</h1><p className="mt-1 text-sm text-muted-foreground">Sample SOPs and guides curated by MBA Compass.</p></section>
    {error && <p className="text-sm text-destructive">Could not load resources.</p>}
    {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? <p className="section-card p-6 text-center text-sm text-muted-foreground">No resources published yet. Check back soon.</p> :
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.map((r, i) => <article key={r.id} style={{ "--i": i } as React.CSSProperties} className="animate-reveal card-lift section-card flex flex-col overflow-hidden">
        {r.banner ? <img src={r.banner} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-primary to-ink text-lg font-bold text-primary-foreground">{r.category}</div>}
        <div className="flex flex-1 flex-col gap-2 p-4"><span className="text-xs font-semibold uppercase tracking-wide text-primary">{r.category}</span><h2 className="text-lg font-bold">{r.title}</h2>{r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}{r.instructions && <p className="rounded-md bg-secondary/60 p-2 text-xs"><strong>How to use: </strong>{r.instructions}</p>}
          <Button className="mt-auto" disabled={busy === r.id} onClick={() => get(r.id)}>{busy === r.id ? "Preparing…" : "Download PDF"}</Button></div>
      </article>)}</div>}
  </div>;
}
