import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import { processTrainingDoc, type CollegeKnowledge } from "@/lib/training.functions";
import { sectionMinutes } from "@/lib/interview-structure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/training")({ component: TrainingPage });

const STATUS: Record<string, string> = { reading: "AI is Reading", saved: "Saved to Intelligence System", failed: "Could not read" };

function TrainingPage() {
  const staff = useStaff();
  const qc = useQueryClient();
  const process = useServerFn(processTrainingDoc);
  const [college, setCollege] = useState<string>("");
  const [kind, setKind] = useState("training");
  const [uploading, setUploading] = useState(false);
  const { data: colleges = [] } = useQuery({ queryKey: ["admin", "colleges"], queryFn: async () => { const { data, error } = await supabase.from("colleges").select("*").order("name"); if (error) throw error; return data; } });
  const { data: docs = [] } = useQuery({ queryKey: ["admin", "training", college], enabled: !!college, refetchInterval: (q) => (q.state.data?.some((d) => d.status === "reading") ? 4000 : false), queryFn: async () => { const { data, error } = await supabase.from("college_training_docs").select("*").eq("college_id", college).order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "training"] });

  async function readAndProcess(id: string, file?: File) {
    let text: string | null = null;
    if (file && /\.(docx?|txt|md|csv|json)$/i.test(file.name)) {
      if (/\.docx?$/i.test(file.name)) { const mammoth = await import("mammoth"); text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; }
      else text = await file.text();
      text = text.slice(0, 120000);
    }
    try { await process({ data: { docId: id, text } }); } catch (e) { toast.error(`${file?.name ?? "Document"}: ${e instanceof Error ? e.message : "failed"}`); }
    await refresh();
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !college) return;
    setUploading(true);
    const list = [...files];
    const created: { id: string; file: File }[] = [];
    for (const f of list) {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is over 20 MB.`); continue; }
      const path = `${college}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("college-training").upload(path, f, { contentType: f.type || undefined });
      if (error) { toast.error(`${f.name}: ${error.message}`); continue; }
      const { data, error: e2 } = await supabase.from("college_training_docs").insert({ college_id: college, kind, title: f.name, file_path: path, mime_type: f.type || null, created_by: staff.id }).select("id").single();
      if (e2) { toast.error(e2.message); continue; }
      created.push({ id: data.id, file: f });
    }
    setUploading(false);
    await refresh();
    for (const c of created) await readAndProcess(c.id, c.file);
  }

  async function remove(id: string, path: string) {
    if (!confirm("Remove this document and its saved intelligence?")) return;
    await supabase.storage.from("college-training").remove([path]);
    const { error } = await supabase.from("college_training_docs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  const saved = docs.filter((d) => d.status === "saved");
  const qCount = saved.reduce((n, d) => n + ((d.knowledge as CollegeKnowledge | null)?.questions.length ?? 0), 0);
  const cCount = saved.reduce((n, d) => n + ((d.knowledge as CollegeKnowledge | null)?.cases.length ?? 0), 0);

  return <>
    <PageHeader title="AI Training" sub="Private college-wise training documents. Only admins can see these files; students never see them." />
    <DurationSettings canEdit={staff.canOperate} userId={staff.id} />
    <Card title="Upload training material">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2"><Label>College</Label><Select value={college} onValueChange={setCollege}><SelectTrigger><SelectValue placeholder={colleges.length ? "Select college" : "Add colleges first"} /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><Label>Document type</Label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="training">Training (questions, transcripts, patterns)</SelectItem><SelectItem value="case">Case scenarios</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="train-files">Files</Label><Input id="train-files" type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,image/*" disabled={!college || !staff.canOperate || uploading} onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} /><p className="text-xs text-muted-foreground">PDF, Word, text or images · up to 20 MB each</p></div>
      </div>
    </Card>
    {college && <Card title={`Documents (${docs.length})`} sub={`${saved.length} saved · ${qCount} questions · ${cCount} case scenarios learned`}>
      {!docs.length ? <p className="py-6 text-center text-sm text-muted-foreground">No training documents for this college yet.</p> :
        <div className="divide-y">{docs.map((d) => { const k = d.knowledge as CollegeKnowledge | null; return <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="truncate font-semibold">{d.title}</p><p className="text-xs text-muted-foreground">{d.kind === "case" ? "Case scenarios" : "Training"}{k ? ` · ${k.questions.length} questions · ${k.cases.length} cases · ${k.difficulty.replace("_", " ")}` : ""}{d.error ? ` · ${d.error}` : ""}</p></div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.status === "saved" ? "bg-success/15 text-success" : d.status === "failed" ? "bg-destructive/10 text-destructive" : "animate-pulse bg-secondary text-primary"}`}>{STATUS[d.status]}</span>
            {staff.canOperate && d.status === "failed" && <Button size="sm" variant="outline" onClick={() => readAndProcess(d.id)}>Retry</Button>}
            {staff.canOperate && <Button size="sm" variant="ghost" onClick={() => remove(d.id, d.file_path)}>Remove</Button>}</div>
        </div>; })}</div>}
    </Card>}
  </>;
}

function DurationSettings({ canEdit, userId }: { canEdit: boolean; userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["interview-settings"], queryFn: async () => { const { data, error } = await supabase.from("interview_settings").select("duration_minutes").eq("id", 1).single(); if (error) throw error; return data; } });
  const [val, setVal] = useState<string | null>(null);
  const minutes = Number(val ?? data?.duration_minutes ?? 20);
  const s = sectionMinutes(minutes);
  async function save() {
    if (!(minutes >= 5 && minutes <= 90)) return toast.error("Choose between 5 and 90 minutes.");
    const { error } = await supabase.from("interview_settings").update({ duration_minutes: minutes, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Interview duration saved."); setVal(null); await qc.invalidateQueries({ queryKey: ["interview-settings"] });
  }
  return <Card title="Interview duration" sub="Time is split automatically: 20% resume, 50% college intelligence, 30% case-based.">
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-2"><Label htmlFor="dur">Total minutes</Label><Input id="dur" type="number" min={5} max={90} className="w-32" value={val ?? data?.duration_minutes ?? ""} disabled={!canEdit} onChange={(e) => setVal(e.target.value)} /></div>
      {canEdit && <Button onClick={save} disabled={val === null}>Save</Button>}
      <table className="text-sm"><tbody><tr className="text-muted-foreground"><td className="pr-6">Resume-based</td><td className="pr-6">College intelligence</td><td>Case-based</td></tr><tr className="font-bold text-primary"><td>{s.resume} min</td><td>{s.college} min</td><td>{s.case} min</td></tr></tbody></table>
    </div>
  </Card>;
}
