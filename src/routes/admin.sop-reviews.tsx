import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/sop-reviews")({
  head: () => ({ meta: [{ title: "SOP Review — MBA Compass Admin" }, { name: "description", content: "Manage SOP requirements, turnaround time and review analytics." }, { property: "og:title", content: "SOP Review admin" }, { property: "og:description", content: "SOP review settings and analytics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminSop,
});

function AdminSop() {
  const qc = useQueryClient();
  const { data: reviews = [] } = useQuery({ queryKey: ["admin", "sop-reviews"], queryFn: async () => (await supabase.from("sop_reviews").select("id, college_name, status, overall_score, report, created_at").order("created_at", { ascending: false }).limit(1000)).data ?? [] });
  const { data: colleges = [] } = useQuery({ queryKey: ["admin", "colleges-sop"], queryFn: async () => (await supabase.from("colleges").select("id, name, sop_requirements").order("name")).data ?? [] });
  const { data: settings } = useQuery({ queryKey: ["admin", "sop-tat"], queryFn: async () => (await supabase.from("interview_settings").select("sop_tat_minutes").eq("id", 1).maybeSingle()).data });
  const [tat, setTat] = useState("60"); const [college, setCollege] = useState(""); const [req, setReq] = useState("");
  useEffect(() => { if (settings) setTat(String(settings.sop_tat_minutes)); }, [settings]);
  useEffect(() => { setReq(colleges.find((c) => c.id === college)?.sop_requirements ?? ""); }, [college, colleges]);

  const done = reviews.filter((r) => r.status === "completed");
  const pending = reviews.filter((r) => r.status === "under_review").length;
  const failed = reviews.filter((r) => r.status === "failed").length;
  const avg = done.length ? Math.round(done.reduce((s, r) => s + (r.overall_score ?? 0), 0) / done.length) : 0;
  const byCollege = Object.entries(reviews.reduce<Record<string, number>>((m, r) => ({ ...m, [r.college_name]: (m[r.college_name] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const weak: Record<string, number> = {};
  for (const r of done) { const c = (r.report as { categories?: Record<string, { score: number }> } | null)?.categories ?? {}; const low = Object.entries(c).sort((a, b) => a[1].score - b[1].score).slice(0, 3); for (const [k] of low) weak[k] = (weak[k] ?? 0) + 1; }
  const common = Object.entries(weak).sort((a, b) => b[1] - a[1]).slice(0, 6);

  async function saveTat() { const n = Number(tat); if (!(n >= 5 && n <= 1440)) return toast.error("Enter 5–1440 minutes."); const { error } = await supabase.from("interview_settings").update({ sop_tat_minutes: n }).eq("id", 1); if (error) return toast.error(error.message); toast.success("Turnaround saved."); qc.invalidateQueries({ queryKey: ["admin", "sop-tat"] }); }
  async function saveReq() { if (!college) return; const { error } = await supabase.from("colleges").update({ sop_requirements: req.trim() || null }).eq("id", college); if (error) return toast.error(error.message); toast.success("Requirements saved."); qc.invalidateQueries({ queryKey: ["admin", "colleges-sop"] }); }

  return <div className="grid gap-6">
    <div><h1 className="text-2xl font-bold">AI SOP Review</h1><p className="text-sm text-muted-foreground">Upload private sample SOPs per college in <Link to="/admin/training" className="font-semibold text-primary underline">AI Training</Link> (type “Sample SOPs”).</p></div>
    <div className="grid gap-4 sm:grid-cols-5">{[["Submissions", reviews.length], ["Completed", done.length], ["Pending", pending], ["Failed", failed], ["Average score", avg]].map(([l, v]) => <div key={l} className="rounded-lg border bg-card p-4"><p className="text-xs font-semibold text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-bold text-primary">{v}</p></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border bg-card p-5"><h2 className="font-bold">College-wise usage</h2><ul className="mt-2 grid gap-1 text-sm">{byCollege.map(([c, n]) => <li key={c} className="flex justify-between"><span>{c}</span><b>{n}</b></li>)}{!byCollege.length && <li className="text-muted-foreground">No submissions yet.</li>}</ul></div>
      <div className="rounded-lg border bg-card p-5"><h2 className="font-bold">Common improvement areas</h2><ul className="mt-2 grid gap-1 text-sm">{common.map(([k, n]) => <li key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g, " ")}</span><b>{n}</b></li>)}{!common.length && <li className="text-muted-foreground">No completed reviews yet.</li>}</ul></div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-3 rounded-lg border bg-card p-5"><h2 className="font-bold">Turnaround time</h2><Label>Expected review time (minutes)</Label><Input type="number" min={5} max={1440} value={tat} onChange={(e) => setTat(e.target.value)} /><Button onClick={saveTat} className="w-fit">Save</Button></div>
      <div className="grid gap-3 rounded-lg border bg-card p-5"><h2 className="font-bold">College SOP requirements</h2>
        <Select value={college} onValueChange={setCollege}><SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Textarea rows={5} value={req} disabled={!college} onChange={(e) => setReq(e.target.value)} placeholder="Word limit, questions to answer, what the panel values…" maxLength={4000} /><Button onClick={saveReq} disabled={!college} className="w-fit">Save requirements</Button></div>
    </div>
  </div>;
}
