import { Button } from "@/components/ui/button";
import { StudentPageHeading } from "@/components/student-page-heading";
import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitSop } from "@/lib/sop.functions";
import { freeSopAllowance, availableSopSlot } from "@/lib/review-benefits";
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
    const { data, error } = await supabase.from("sop_reviews").select("id, college_name, file_name, file_path, status, overall_score, report, samples_used, error, expected_by, created_at, completed_at, extracted_text, analysis_progress, free_credit_slot").eq("user_id", u.user?.id ?? "").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/sop-review")({ staticData: { sitemap: false },
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
  const allowance = freeSopAllowance(reviews);
  const selectedCollege = colleges.find(c => c.id === college);
  const canReview = Boolean(selectedCollege && availableSopSlot(allowance, selectedCollege.name));
  const previewUrl = useDocumentPreview("sop-reviews", processing?.file_path ?? selected?.file_path);

  async function upload(file: File | undefined) {
    setErr(null);
    if (!file) return;
    if (!college) return setErr("Select your target college first.");
    if (!canReview) return setErr(allowance.nmims ? "Your remaining free review is reserved for NMIMS." : "Both free SOP credits have been used.");
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
    <StudentPageHeading eyebrow="Career tools" title="AI SOP Review" description="Make your story matter. Refine your Statement of Purpose for your target college."><div className="border-l-2 border-accent pl-4"><p className="text-3xl font-bold text-primary">{allowance.total}</p><p className="text-xs text-muted-foreground">Free SOP credits remaining</p></div></StudentPageHeading>

    <section className="section-card grid gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-4">
        <div><p className="student-eyebrow">New review</p><h2 className="mt-1 text-xl font-bold">Submit your SOP</h2></div>
        <div className="grid gap-2"><Label><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>Choose your target college</Label>
          <Select value={college} onValueChange={setCollege}><SelectTrigger><SelectValue placeholder={colleges.length ? "Select college" : "No colleges added yet"} /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid gap-2"><Label><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>Upload your SOP</Label>
          <label className={`grid place-items-center rounded-lg border-2 border-dashed border-primary/30 bg-secondary/40 px-6 py-7 text-center transition ${busy || !college ? "opacity-60" : "cursor-pointer hover:border-primary hover:bg-secondary"}`}>
            <span className="text-base font-semibold text-primary">{busy ? "SOP under review…" : college ? "Choose SOP file" : "Select a college first"}</span>
            <span className="mt-1 text-xs text-muted-foreground">PDF, DOC/DOCX, TXT or image · up to 10 MB</span>
            <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" disabled={busy || Boolean(processing) || !canReview} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        {err && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{err}</p>}
      </div>
      <aside className="rounded-lg border bg-secondary/30 p-5">
        <p className="student-eyebrow">What you receive</p>
        <ol className="mt-3 grid gap-3 text-sm">{[["Overall score", "Rated across 13 categories with clear reasons."], ["College fit", "How well your story matches your chosen school."], ["Line-by-line feedback", "Exact sentences to add, cut or strengthen."], ["Rewritten SOP", "An improved version in your own voice, ready to download."]].map(([t, d], i) => <li key={t} className="flex gap-3"><span className="mt-0.5 inline-grid size-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-card text-xs font-bold text-primary">{i + 1}</span><div><p className="font-semibold">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div></li>)}</ol>
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Two free reviews per student: one for any available college and one reserved for NMIMS. Failed reviews do not use a credit. {allowance.general} general · {allowance.nmims} NMIMS remaining.</p>
      </aside>
    </section>

    {(busy || processing) && <DocumentAnalysisWorkspace kind="sop" file={file} previewUrl={previewUrl} fileName={processing?.file_name ?? file?.name} progress={(processing?.analysis_progress ?? null) as unknown as ReviewProgress | null} sourceText={sourceText ?? processing?.extracted_text} />}
    {reviews.length > 0 && <section className="section-card p-6"><h2 className="text-xl font-bold">My SOP reviews</h2>
      <div className="mt-3 divide-y">{reviews.map((r) => { const label = sopStatusLabel(r); return <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <div className="min-w-0"><p className="truncate font-semibold">{r.college_name} · {r.file_name}</p><p className="text-xs text-muted-foreground">Submitted {new Date(r.created_at).toLocaleString()}{r.status === "under_review" ? ` · expected by ${new Date(r.expected_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{r.error ? ` · ${r.error}` : ""}</p></div>
        <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === "completed" ? "bg-success/15 text-success" : r.status === "failed" ? "bg-destructive/10 text-destructive" : "animate-pulse bg-secondary text-primary"}`}>{label}</span>
          {r.status === "completed" && <Button variant="ghost" size="sm" onClick={() => setOpenId(r.id)}>{r.overall_score}/100 · View</Button>}</div>
      </div>; })}</div>
    </section>}

    {!busy && selected?.status === "completed" && selected.report && <Report key={selected.id} report={selected.report as unknown as SopReport} college={selected.college_name} samples={selected.samples_used} evidence={<DocumentAnalysisWorkspace kind="sop" previewUrl={previewUrl} fileName={selected.file_name} progress={(selected.analysis_progress ?? { phase: "complete", sections: selected.report, updatedAt: selected.completed_at }) as unknown as ReviewProgress} sourceText={selected.extracted_text} complete />} />}
  </div>;
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <div className={`section-card border-t-4 p-5 ${tone}`}><h3 className="font-bold">{title}</h3><ul className="mt-2 grid gap-1.5 text-sm">{items.map((x, i) => <li key={i}>· {x}</li>)}{!items.length && <li className="text-muted-foreground">Nothing here.</li>}</ul></div>;
}

function band(n: number) { return n >= 80 ? "Excellent" : n >= 65 ? "Good" : n >= 50 ? "Needs work" : "Weak"; }
const esc = (t: string) => (t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
function sopHtml(sop: NonNullable<SopReport["improved_sop"]>) {
  return `<html><head><meta charset="utf-8"><title>${esc(sop.title)}</title><style>@page{size:A4;margin:22mm 22mm}body{font-family:Calibri,Carlito,Arial,sans-serif;color:#111;max-width:700px;margin:0 auto;font-size:11.5pt;line-height:1.6}h1{font-size:15pt;text-align:center;color:#1f3a5f;margin:0 0 18px;letter-spacing:.5px}p{margin:0 0 12px;text-align:justify}</style></head><body><h1>${esc(sop.title)}</h1>${sop.paragraphs.map((x) => `<p>${esc(x)}</p>`).join("")}</body></html>`;
}

function Report({ report, college, samples, evidence }: { report: SopReport; college: string; samples: number; evidence: ReactNode }) {
  const cats = (Object.keys(SOP_CATEGORY_LABELS) as (keyof typeof SOP_CATEGORY_LABELS)[]).map((k) => ({ k, ...report.categories[k] }));
  const sorted = [...cats].sort((a, b) => b.score - a.score);
  const sop = report.improved_sop;
  function downloadWord() { if (!sop) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([sopHtml(sop)], { type: "application/msword" })); a.download = "SOP_improved.doc"; a.click(); URL.revokeObjectURL(a.href); }
  function printPdf() { if (!sop) return; const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to save as PDF."); w.document.write(sopHtml(sop)); w.document.close(); w.focus(); w.print(); }
  return <div className="grid gap-6 animate-reveal">
    <section className="section-card overflow-hidden p-0">
      <div className="bg-gradient-panel flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
        <div className="shrink-0 text-primary"><ScoreRing value={report.overall_score} size={128} label="SOP score" tone="primary" /></div>
        <div className="min-w-0 flex-1"><p className="student-eyebrow">Detailed SOP report · {college}</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">{band(report.overall_score)} statement</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{report.summary}</p></div>
      </div>
      <dl className="grid grid-cols-3 gap-px border-t bg-border">
        {([["Words", report.word_count], ["Lines reviewed", report.line_feedback.length], ["College fit", report.categories.college_fit.score]] as const).map(([l, v]) => <div key={l} className="bg-card px-5 py-4"><dt className="text-xs font-semibold uppercase text-muted-foreground">{l}</dt><dd className="mt-1 text-2xl font-bold text-primary"><AnimatedNumber value={v} /></dd></div>)}
      </dl>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2"><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-success">Strongest areas</span><p className="mt-1 font-semibold">{sorted.slice(0, 3).map((c) => SOP_CATEGORY_LABELS[c.k]).join(" · ")}</p></div><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-destructive">Fix first</span><p className="mt-1 font-semibold">{sorted.slice(-3).reverse().map((c) => SOP_CATEGORY_LABELS[c.k]).join(" · ")}</p></div></div>
    </section>
    <Tabs defaultValue="report">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="report">Full report</TabsTrigger><TabsTrigger value="lines">Line-by-line feedback</TabsTrigger><TabsTrigger value="sop">Recreated SOP</TabsTrigger><TabsTrigger value="source">Source evidence</TabsTrigger></TabsList>
      <TabsContent value="report" className="grid gap-6">
        <section className="section-card p-6"><h2 className="text-xl font-bold">Category scores</h2>
          <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">{cats.map((c) => <div key={c.k}><div className="flex justify-between text-sm"><span className="font-semibold">{SOP_CATEGORY_LABELS[c.k]}</span><span className="font-bold text-primary"><AnimatedNumber value={c.score} /><span className="ml-1 text-xs font-normal text-muted-foreground">{band(c.score)}</span></span></div><GrowBar value={c.score} tone={c.score >= 65 ? "bg-success" : c.score >= 50 ? "bg-primary" : "bg-destructive"} className="mt-1.5" /><p className="mt-1 text-xs text-muted-foreground">{c.comment}</p></div>)}</div>
        </section>
        <section className="section-card p-6"><h2 className="text-xl font-bold">College fit</h2><p className="mt-2 text-sm leading-relaxed">{report.college_fit_notes}</p>{samples > 0 && <p className="mt-2 text-xs text-muted-foreground">Compared against {samples} private sample SOP{samples === 1 ? "" : "s"} for this college.</p>}</section>
        <section className="grid gap-4 md:grid-cols-3"><List title="Strengths" items={report.strengths} tone="border-success" /><List title="Weaknesses" items={report.weaknesses} tone="border-destructive" /><List title="Opportunities" items={report.opportunities} tone="border-primary" /></section>
        <section className="grid gap-4 md:grid-cols-2"><List title="Add" items={report.add_points} tone="border-success" /><List title="Remove" items={report.remove_points} tone="border-destructive" /><List title="Clarify" items={report.clarify_points} tone="border-primary" /><List title="Strengthen" items={report.strengthen_points} tone="border-accent" /></section>
      </TabsContent>
      <TabsContent value="lines" className="grid gap-4">{report.line_feedback.map((l, i) => <div key={i} className="section-card grid gap-3 p-5 text-sm">
        <p className="rounded-md border-l-4 border-destructive/50 bg-destructive/5 p-3 italic">“{l.original}”</p>
        <div className="grid gap-2 md:grid-cols-3"><p><span className="block text-xs font-semibold uppercase text-muted-foreground">What is wrong</span>{l.whats_wrong}</p><p><span className="block text-xs font-semibold uppercase text-muted-foreground">Why it matters</span>{l.why}</p><p><span className="block text-xs font-semibold uppercase text-muted-foreground">How to improve</span>{l.how_to_improve}</p></div>
        <p className="rounded-md border border-success/40 bg-success/10 p-3"><span className="block text-xs font-bold text-success">Suggested line</span>{l.suggestion}</p>
      </div>)}</TabsContent>
      <TabsContent value="sop">{sop ? <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Polished in your own voice</p><p className="text-sm text-muted-foreground">Uses only what you wrote. Replace any [placeholders] with your real details.</p></div><div className="flex gap-2"><Button variant="outline" onClick={downloadWord}>Download Word</Button><Button onClick={printPdf}>Save as PDF</Button></div></div>
        <div className="rounded-xl bg-muted/60 p-3 sm:p-8"><article className="mx-auto w-full max-w-[794px] bg-card px-6 py-10 shadow-soft sm:px-16 sm:py-14"><h2 className="mb-6 text-center text-xl font-bold tracking-wide text-primary">{sop.title}</h2>{sop.paragraphs.map((p, i) => <p key={i} className="mb-4 text-justify text-[0.95rem] leading-7">{p}</p>)}</article></div>
        {sop.changes.length > 0 && <section className="section-card p-5"><h3 className="font-bold">What we improved</h3><ol className="mt-2 grid gap-1.5 text-sm">{sop.changes.map((c, i) => <li key={i}><strong className="text-primary">{i + 1}.</strong> {c}</li>)}</ol></section>}
      </div> : <p className="section-card p-6 text-sm text-muted-foreground">This earlier review was made before recreated SOPs were available. Submit again to get one.</p>}</TabsContent>
      <TabsContent value="source">{evidence}</TabsContent>
    </Tabs>
  </div>;
}
