import { Button } from "@/components/ui/button";
import { StudentPageHeading } from "@/components/student-page-heading";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitSop } from "@/lib/sop.functions";
import { DocumentAnalysisWorkspace } from "@/components/document-analysis-workspace";
import type { ReviewProgress } from "@/lib/document-progress";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { SOP_CATEGORY_LABELS, SOP_FILE_TYPES, sopStatusLabel, type SopReport } from "@/lib/sop-review";
import { ScoreRing, GrowBar, AnimatedNumber } from "@/components/motion";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const sopReviewsQuery = queryOptions({
  queryKey: ["sop-reviews"],
  refetchInterval: (query) => query.state.data?.some((r) => r.status === "under_review") ? 1500 : false,
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("sop_reviews").select("id, college_name, file_name, file_path, status, overall_score, report, samples_used, error, expected_by, created_at, completed_at, extracted_text, analysis_progress").eq("user_id", u.user?.id ?? "").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/sop-review")({
  head: () => ({ meta: [{ title: "AI SOP Review — MBA Compass AI Interview" }, { name: "description", content: "College-specific AI review of your Statement of Purpose with scores and line-by-line feedback." }, { property: "og:title", content: "AI SOP Review — MBA Compass" }, { property: "og:description", content: "Get detailed, college-specific feedback on your SOP." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sopReviewsQuery),
  component: SopReview,
});

function SopReview() {
  const { data: reviews } = useSuspenseQuery(sopReviewsQuery);
  const { data: colleges = [] } = useQuery({ queryKey: ["colleges", "active"], queryFn: async () => (await supabase.from("colleges").select("id, name").eq("active", true).order("name")).data ?? [] });
  const qc = useQueryClient();
  const submit = useServerFn(submitSop);
  const [college, setCollege] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = reviews.find((r) => r.id === openId) ?? reviews.find((r) => r.status === "completed");
  const processing = reviews.find((r) => r.status === "under_review");
  const previewUrl = useDocumentPreview("sop-reviews", processing?.file_path ?? selected?.file_path);

  async function upload(file: File | undefined) {
    setErr(null);
    if (!file) return;
    if (!college) return setErr("Select your target college first.");
    if (!SOP_FILE_TYPES.test(file.name)) return setErr("Unsupported format. Upload a PDF, DOC/DOCX, TXT or image file.");
    if (!file.size) return setErr("This file is empty.");
    if (file.size > 10 * 1024 * 1024) return setErr("File is larger than 10 MB.");
    setBusy(true); setFile(file); setSourceText(null);
    try {
      let text: string | null = null; let mime = file.type || "application/octet-stream";
      if (/\.docx?$/i.test(file.name)) {
        try { const mammoth = await import("mammoth"); text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim().slice(0, 60000); }
        catch { throw new Error("This Word file could not be read. Save it as PDF and try again."); }
        mime = "application/msword";
      } else if (/\.txt$/i.test(file.name)) { text = (await file.text()).slice(0, 60000); mime = "text/plain"; }
      else if (/\.pdf$/i.test(file.name)) mime = "application/pdf";
      if (text !== null && text.length < 200) throw new Error("This document has too little text to be an SOP.");
      setSourceText(text);
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("sop-reviews").upload(path, file, { contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      const p = submit({ data: { collegeId: college, path, fileName: file.name, mimeType: mime, text } });
      const poll = setInterval(() => void qc.invalidateQueries({ queryKey: ["sop-reviews"] }), 1500);
      const res = await p.finally(() => clearInterval(poll));
      if (!res.ok) throw new Error(res.error);
      toast.success("Review completed.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Submission failed."); }
    finally { setBusy(false); setOpenId(null); await qc.invalidateQueries({ queryKey: ["sop-reviews"] }); }
  }

  return <div className="grid gap-6">
    <StudentPageHeading eyebrow="Career tools" title="AI SOP Review" description="Make your story matter. Refine your Statement of Purpose for your target college."><div className="border-l-2 border-accent pl-4"><p className="text-3xl font-bold text-primary">{reviews.length}</p><p className="text-xs text-muted-foreground">SOP submissions</p></div></StudentPageHeading>

    <section className="section-card grid gap-4 p-6">
      <h2 className="text-xl font-bold">Submit your SOP</h2>
      <div className="grid max-w-md gap-2"><Label>Target college</Label>
        <Select value={college} onValueChange={setCollege}><SelectTrigger><SelectValue placeholder={colleges.length ? "Select college" : "No colleges added yet"} /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <label className={`grid place-items-center rounded-lg border-2 border-dashed border-primary/30 bg-secondary/40 p-8 text-center transition ${busy || !college ? "opacity-60" : "cursor-pointer hover:bg-secondary"}`}>
        <span className="text-base font-semibold text-primary">{busy ? "SOP Under Review…" : "Choose SOP file"}</span>
        <span className="mt-1 text-xs text-muted-foreground">PDF, DOC/DOCX, TXT or image · up to 10 MB · expected turnaround within 1 hour</span>
        <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" disabled={busy || !college} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {err && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{err}</p>}
    </section>

    {(busy || processing || selected) && <DocumentAnalysisWorkspace kind="sop" file={busy || processing ? file : null} previewUrl={previewUrl} fileName={processing?.file_name ?? selected?.file_name ?? file?.name} progress={(processing?.analysis_progress ?? (busy ? null : selected?.analysis_progress ?? (selected ? {phase:"complete",sections:selected.report,updatedAt:selected.completed_at} : null))) as unknown as ReviewProgress | null} sourceText={busy || processing ? sourceText ?? processing?.extracted_text : selected?.extracted_text} complete={!busy && !processing && selected?.status === "completed"} />}
    {reviews.length > 0 && <section className="section-card p-6"><h2 className="text-xl font-bold">My SOP reviews</h2>
      <div className="mt-3 divide-y">{reviews.map((r) => { const label = sopStatusLabel(r); return <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <div className="min-w-0"><p className="truncate font-semibold">{r.college_name} · {r.file_name}</p><p className="text-xs text-muted-foreground">Submitted {new Date(r.created_at).toLocaleString()}{r.status === "under_review" ? ` · expected by ${new Date(r.expected_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{r.error ? ` · ${r.error}` : ""}</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === "completed" ? "bg-success/15 text-success" : r.status === "failed" ? "bg-destructive/10 text-destructive" : "animate-pulse bg-secondary text-primary"}`}>{label}</span>
          {r.status === "completed" && <Button variant="ghost" size="sm" onClick={() => setOpenId(r.id)}>{r.overall_score}/100 · View</Button>}</div>
      </div>; })}</div>
    </section>}

    {selected?.status === "completed" && selected.report && <Report report={selected.report as unknown as SopReport} college={selected.college_name} samples={selected.samples_used} />}
  </div>;
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <div className={`section-card border-l-4 p-5 ${tone}`}><h3 className="font-bold">{title}</h3><ul className="mt-2 grid gap-1.5 text-sm">{items.map((x, i) => <li key={i}>· {x}</li>)}{!items.length && <li className="text-muted-foreground">Nothing here.</li>}</ul></div>;
}

function Report({ report, college, samples }: { report: SopReport; college: string; samples: number }) {
  return <div className="grid gap-6 animate-reveal">
    <section className="section-card grid gap-6 p-6 md:grid-cols-[auto_1fr]">
      <div className="text-primary"><ScoreRing value={report.overall_score} size={120} label="SOP score" tone="primary" /></div>
      <div><p className="text-xs text-muted-foreground">{college} · about {report.word_count} words{samples > 0 ? ` · compared against ${samples} private sample SOP${samples === 1 ? "" : "s"} for this college` : ""}</p><p className="mt-2 text-sm leading-relaxed">{report.summary}</p><p className="mt-3 rounded-md bg-secondary p-3 text-sm"><span className="font-semibold text-primary">College fit: </span>{report.college_fit_notes}</p></div>
    </section>
    <section className="section-card p-6"><h2 className="text-xl font-bold">Category scores</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{(Object.keys(SOP_CATEGORY_LABELS) as (keyof typeof SOP_CATEGORY_LABELS)[]).map((k) => { const c = report.categories[k]; return <div key={k}><div className="flex justify-between text-sm"><span className="font-semibold">{SOP_CATEGORY_LABELS[k]}</span><span className="font-bold text-primary"><AnimatedNumber value={c.score} /></span></div><GrowBar value={c.score} tone="bg-primary" className="mt-1.5" /><p className="mt-1 text-xs text-muted-foreground">{c.comment}</p></div>; })}</div>
    </section>
    <section className="grid gap-4 md:grid-cols-3"><List title="Strengths" items={report.strengths} tone="border-success/40" /><List title="Weaknesses" items={report.weaknesses} tone="border-destructive/40" /><List title="Improvement opportunities" items={report.opportunities} tone="border-primary/40" /></section>
    <section className="section-card p-6"><h2 className="text-xl font-bold">Line-by-line feedback</h2>
      <div className="mt-3 divide-y">{report.line_feedback.map((l, i) => <div key={i} className="grid gap-1.5 py-4 text-sm">
        <p className="rounded-md border-l-4 border-destructive/40 bg-muted/50 p-2 italic">“{l.original}”</p>
        <p><span className="font-semibold text-muted-foreground">What is wrong: </span>{l.whats_wrong}</p>
        <p><span className="font-semibold text-muted-foreground">Why it matters: </span>{l.why}</p>
        <p><span className="font-semibold text-muted-foreground">How to improve: </span>{l.how_to_improve}</p>
        <p className="rounded-md bg-secondary p-2"><span className="font-semibold text-primary">Suggestion: </span>{l.suggestion}</p>
      </div>)}</div>
    </section>
    <section className="grid gap-4 md:grid-cols-2"><List title="Add" items={report.add_points} tone="border-success/40" /><List title="Remove" items={report.remove_points} tone="border-destructive/40" /><List title="Clarify" items={report.clarify_points} tone="border-primary/40" /><List title="Strengthen" items={report.strengthen_points} tone="border-accent" /></section>
  </div>;
}
