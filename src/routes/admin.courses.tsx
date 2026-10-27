import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import type { Deliverable } from "@/components/course-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/courses")({ component: CoursesPage });

type Form = { id: string | null; name: string; actual: string; final: string; credits: string; description: string; rows: Deliverable[] };
const blank: Form = { id: null, name: "", actual: "", final: "", credits: "1", description: "", rows: [{ item: "", detail: "" }] };

function CoursesPage() {
  const staff = useStaff();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(blank);
  const [saving, setSaving] = useState(false);
  const { data = [] } = useQuery({ queryKey: ["admin", "courses"], queryFn: async () => { const { data, error } = await supabase.from("courses").select("*").order("sort_order").order("created_at"); if (error) throw error; return data; } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "courses"] });

  async function save(status?: string) {
    const actual = Number(f.actual), final = Number(f.final), credits = Number(f.credits);
    if (!f.name.trim()) return toast.error("Enter a course name.");
    if (!(final >= 1) || !(actual >= 0) || !Number.isInteger(credits) || credits < 0) return toast.error("Check prices and credits.");
    const row = { name: f.name.trim(), actual_price: actual, final_price: final, credits, description: f.description.trim() || null, deliverables: f.rows.filter((r) => r.item.trim()), updated_at: new Date().toISOString(), ...(status ? { status } : {}) };
    setSaving(true);
    const { error } = f.id ? await supabase.from("courses").update(row).eq("id", f.id) : await supabase.from("courses").insert({ ...row, created_by: staff.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(f.id ? "Course updated." : "Course created."); setF(blank); await refresh();
  }
  async function setStatus(id: string, status: string) { const { error } = await supabase.from("courses").update({ status }).eq("id", id); if (error) return toast.error(error.message); await refresh(); }
  async function remove(id: string) { if (!confirm("Delete this course? Past purchases are kept.")) return; const { error } = await supabase.from("courses").delete().eq("id", id); if (error) return toast.error(error.message); await refresh(); }
  const setRow = (i: number, p: Partial<Deliverable>) => setF({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  return <>
    <PageHeader title="Courses" sub="Courses students can buy with Razorpay. Live courses appear on the student slots page." />
    {staff.canOperate && <Card title={f.id ? "Edit course" : "Create course"}>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-2 md:col-span-4"><Label>Name of the course</Label><Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid gap-2"><Label>Actual price (₹)</Label><Input type="number" min={0} value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} /></div>
        <div className="grid gap-2"><Label>Final price (₹)</Label><Input type="number" min={1} value={f.final} onChange={(e) => setF({ ...f, final: e.target.value })} /></div>
        <div className="grid gap-2"><Label>Interview credits allotted</Label><Input type="number" min={0} step={1} value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></div>
        <div className="grid gap-2 md:col-span-4"><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <div className="mt-4"><Label>Deliverables</Label>
        <table className="mt-2 w-full text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr><th className="p-2 text-left">Deliverable</th><th className="p-2 text-left">Details</th><th className="w-20" /></tr></thead>
          <tbody>{f.rows.map((r, i) => <tr key={i}><td className="p-1"><Input value={r.item} placeholder="e.g. Live AI interviews" onChange={(e) => setRow(i, { item: e.target.value })} /></td><td className="p-1"><Input value={r.detail} placeholder="e.g. 5 sessions" onChange={(e) => setRow(i, { detail: e.target.value })} /></td><td className="p-1"><Button size="sm" variant="ghost" onClick={() => setF({ ...f, rows: f.rows.filter((_, j) => j !== i) })}>Remove</Button></td></tr>)}</tbody></table>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setF({ ...f, rows: [...f.rows, { item: "", detail: "" }] })}>Add row</Button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={saving} onClick={() => save()}>{f.id ? "Save changes" : "Save as draft"}</Button>
        {!f.id && <Button disabled={saving} variant="secondary" onClick={() => save("live")}>Save and make live</Button>}
        {f.id && <Button variant="ghost" onClick={() => setF(blank)}>Cancel edit</Button>}
      </div>
    </Card>}
    <Card title={`All courses (${data.length})`}>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{["Course", "Actual", "Final", "Credits", "Status", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{data.map((c) => <tr key={c.id}><td className="p-3 font-semibold">{c.name}</td><td className="p-3">₹{Number(c.actual_price).toLocaleString("en-IN")}</td><td className="p-3 font-bold text-primary">₹{Number(c.final_price).toLocaleString("en-IN")}</td><td className="p-3">{c.credits}</td><td className="p-3"><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">{c.status}</span></td>
          <td className="p-3">{staff.canOperate && <div className="flex flex-wrap gap-2">
            {c.status !== "live" ? <Button size="sm" onClick={() => setStatus(c.id, "live")}>Make live</Button> : <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "disabled")}>Disable</Button>}
            <Button size="sm" variant="outline" onClick={() => setF({ id: c.id, name: c.name, actual: String(c.actual_price), final: String(c.final_price), credits: String(c.credits), description: c.description ?? "", rows: ((c.deliverables as unknown as Deliverable[]) ?? []).length ? (c.deliverables as unknown as Deliverable[]) : [{ item: "", detail: "" }] })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button></div>}</td></tr>)}
          {!data.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No courses yet.</td></tr>}</tbody></table></div>
    </Card>
  </>;
}
