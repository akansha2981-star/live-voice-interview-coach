import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, PageHeader, StatusPill } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import { fmtDateTime, validateUpload } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PREP_SECTIONS, isEventCategory, prepByCategory, safeUrl } from "@/lib/prep";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/resources")({ component: ResourcesPage });

type Res = { id: string; title: string; description: string | null; instructions: string | null; category: string; banner_path: string | null; pdf_path: string | null; published: boolean; sort_order: number; created_at: string; event_at: string | null; registration_url: string | null };
const blank = { title: "", description: "", instructions: "", category: "SOP", sort_order: 0, published: false, event_local: "", registration_url: "" };
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

async function upload(file: File, folder: "banners" | "pdfs") {
  const err = validateUpload(file, folder === "pdfs" ? 20 : 5);
  if (err) throw new Error(err);
  if (folder === "pdfs" && file.type !== "application/pdf") throw new Error("Upload a PDF file.");
  if (folder === "banners" && !file.type.startsWith("image/")) throw new Error("Upload a PNG, JPG or WEBP image.");
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("resources").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

function ResourcesPage() {
  const staff = useStaff(); const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<(typeof blank & { id?: string; banner_path?: string | null; pdf_path?: string | null }) | null>(null);
  const [banner, setBanner] = useState<File | null>(null); const [pdf, setPdf] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "resources"], queryFn: async () => { const { data, error } = await supabase.from("resources").select("*").order("sort_order").order("created_at"); if (error) throw error; return data as Res[]; } });
  async function save() {
    if (!edit || edit.title.trim().length < 3) return toast.error("Enter a title.");
    setBusy(true);
    try {
      const banner_path = banner ? await upload(banner, "banners") : edit.banner_path ?? null;
      const pdf_path = pdf ? await upload(pdf, "pdfs") : edit.pdf_path ?? null;
      const event = isEventCategory(edit.category);
      const registration_url = edit.registration_url.trim() ? safeUrl(edit.registration_url) : null;
      if (edit.registration_url.trim() && !registration_url) throw new Error("Enter a full registration link starting with https://");
      if (event && edit.published && (!edit.event_local || !registration_url)) throw new Error("Add the date, time and registration link before publishing.");
      if (!event && edit.published && !pdf_path) throw new Error("Add a PDF before publishing.");
      const row = { title: edit.title.trim(), description: edit.description, instructions: edit.instructions, category: edit.category, sort_order: edit.sort_order, published: edit.published, banner_path, pdf_path, event_at: edit.event_local ? new Date(edit.event_local).toISOString() : null, registration_url, updated_at: new Date().toISOString() };
      const { error } = edit.id ? await supabase.from("resources").update(row).eq("id", edit.id) : await supabase.from("resources").insert({ ...row, created_by: staff.id });
      if (error) throw error;
      await supabase.rpc("log_audit", { _action: edit.id ? "resource_updated" : "resource_created", _target: null as unknown as string, _details: { title: row.title, published: row.published } });
      toast.success("Resource saved"); setEdit(null); setBanner(null); setPdf(null); qc.invalidateQueries({ queryKey: ["admin", "resources"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }
  async function patch(r: Res, u: Partial<Res>) { const { error } = await supabase.from("resources").update(u).eq("id", r.id); if (error) return toast.error(error.message); qc.invalidateQueries({ queryKey: ["admin", "resources"] }); }
  async function remove(r: Res) { if (!confirm(`Delete "${r.title}"?`)) return; const { error } = await supabase.from("resources").delete().eq("id", r.id); if (error) return toast.error(error.message); await supabase.storage.from("resources").remove([r.banner_path, r.pdf_path].filter(Boolean) as string[]); qc.invalidateQueries({ queryKey: ["admin", "resources"] }); }
  return <>
    <PageHeader title="Prep Material" sub="Sample SOPs, GDPI dockets, domain dossiers, masterclasses and GK Hub">{staff.canOperate && <Button onClick={() => setEdit({ ...blank, sort_order: data.length })}>New material</Button>}</PageHeader>
    <div className="mb-3 flex flex-wrap gap-2">{[["all", "All"], ...PREP_SECTIONS.map((p) => [p.category, p.label])].map(([v, l]) => <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>)}</div>
    <Card>
      <DataTable loading={isLoading} rows={filter === "all" ? data : data.filter((r) => r.category === filter)} empty="No resources yet. Create your first one." cols={[
        { key: "sort_order", label: "Order", render: (r) => staff.canOperate ? <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => patch(r, { sort_order: r.sort_order - 1 })}>Up</Button><Button size="sm" variant="ghost" onClick={() => patch(r, { sort_order: r.sort_order + 1 })}>Down</Button></div> : r.sort_order },
        { key: "title", label: "Title", render: (r) => <div><p className="font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{prepByCategory(r.category)?.label ?? r.category}{r.event_at ? ` · ${fmtDateTime(r.event_at)}` : ""}</p></div> },
        { key: "files", label: "Files", render: (r) => <span className="text-xs">{isEventCategory(r.category) ? (r.registration_url ? "Registration link" : "No link") : r.pdf_path ? "PDF" : "No PDF"} · {r.banner_path ? "Poster" : "No poster"}</span> },
        { key: "published", label: "Status", render: (r) => <StatusPill s={r.published ? "published" : "draft"} /> },
        { key: "created_at", label: "Uploaded", render: (r) => fmtDateTime(r.created_at) },
        { key: "a", label: "", render: (r) => staff.canOperate && <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => setEdit({ id: r.id, title: r.title, description: r.description ?? "", instructions: r.instructions ?? "", category: r.category, sort_order: r.sort_order, published: r.published, banner_path: r.banner_path, pdf_path: r.pdf_path, event_local: toLocal(r.event_at), registration_url: r.registration_url ?? "" })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => patch(r, { published: !r.published })} disabled={!r.published && (isEventCategory(r.category) ? !r.event_at || !r.registration_url : !r.pdf_path)}>{r.published ? "Unpublish" : "Publish"}</Button><Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button></div> },
      ]} />
    </Card>
    <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent className="max-w-xl">{edit && <><DialogHeader><DialogTitle>{edit.id ? "Edit material" : "New material"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <Input placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
        <label className="grid gap-1 text-sm">Section<select className="h-10 rounded-md border bg-background px-3 text-sm" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{PREP_SECTIONS.map((p) => <option key={p.category} value={p.category}>{p.label}</option>)}{!prepByCategory(edit.category) && <option value={edit.category}>{edit.category}</option>}</select></label>
        {isEventCategory(edit.category) && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Date and time<Input type="datetime-local" value={edit.event_local} onChange={(e) => setEdit({ ...edit, event_local: e.target.value })} /></label><label className="grid gap-1 text-sm">Registration link<Input placeholder="https://…" value={edit.registration_url} onChange={(e) => setEdit({ ...edit, registration_url: e.target.value })} /></label></div>}
        <Textarea placeholder="Short description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        <Textarea placeholder="Instructions for use" value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
        <label className="grid gap-1 text-sm">{isEventCategory(edit.category) ? "Banner" : "Small poster"} (PNG/JPG/WEBP, max 5 MB){edit.banner_path && <span className="text-xs text-muted-foreground">Current banner kept unless replaced</span>}<Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} /></label>
        <label className="grid gap-1 text-sm">{isEventCategory(edit.category) ? "Document (optional PDF, max 20 MB)" : "Document PDF (max 20 MB)"}{edit.pdf_path && <span className="text-xs text-muted-foreground">Current PDF kept unless replaced</span>}<Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></label>
        <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />Published</label><label className="flex items-center gap-2 text-sm">Display order<Input type="number" className="w-20" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} /></label></div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div>
      </div></>}</DialogContent></Dialog>
  </>;
}
