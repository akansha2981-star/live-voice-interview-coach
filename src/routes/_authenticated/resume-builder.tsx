import { StudentPageHeading } from "@/components/student-page-heading";
import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/resume.functions";
import { CATEGORY_LABELS, RESUME_FILE_TYPES, resumeCreditsLeft, type ResumeReport } from "@/lib/resume-analysis";
import { DocumentAnalysisWorkspace } from "@/components/document-analysis-workspace";
import type { ReviewProgress } from "@/lib/document-progress";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { ScoreRing, GrowBar, AnimatedNumber } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const resumeAnalysesQuery = queryOptions({
  queryKey: ["resume-analyses"],
  refetchInterval: (query) => query.state.data?.some((r) => r.status === "processing") ? 1500 : false,
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("resume_analyses").select("*").eq("user_id", u.user?.id ?? "").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/resume-builder")({
  head: () => ({ meta: [{ title: "Resume Builder — MBA Compass AI Interview" }, { name: "description", content: "AI resume analysis, ATS score, SWOT and an improved ATS-friendly resume." }, { property: "og:title", content: "Resume Builder — MBA Compass" }, { property: "og:description", content: "Analyse your resume and build an ATS-friendly version." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resumeAnalysesQuery),
  component: ResumeBuilder,
});

type Improved = ResumeReport["improved_resume"];

function ResumeBuilder() {
  const { data: analyses } = useSuspenseQuery(resumeAnalysesQuery);
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeResume);
  const [running, setRunning] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const credits = resumeCreditsLeft(analyses);
  const done = analyses.find((a) => a.status === "completed");
  const processing = analyses.find((a) => a.status === "processing");
  const previewUrl = useDocumentPreview("resume-analyses", processing?.file_path ?? done?.file_path);

  async function upload(file: File | undefined) {
    setErrorMsg(null);
    if (!file) return;
    if (!RESUME_FILE_TYPES.test(file.name)) return setErrorMsg("Unsupported format. Upload a PDF, Word (DOC/DOCX) or image file.");
    if (file.size === 0) return setErrorMsg("This file is empty. Please upload your full resume.");
    if (file.size > 10 * 1024 * 1024) return setErrorMsg("File is larger than 10 MB.");
    setRunning(true); setFile(file); setSourceText(null);
    try {
      let text: string | null = null;
      let mime = file.type || "application/octet-stream";
      if (/\.docx?$/i.test(file.name)) {
        try { const mammoth = await import("mammoth"); text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim().slice(0, 60000); }
        catch { throw new Error("This Word file could not be read. Save it as PDF and try again."); }
        if (text.length < 80) throw new Error("This document looks blank or has too little text to be a resume.");
        mime = "application/msword";
      } else if (/\.pdf$/i.test(file.name)) mime = "application/pdf";
      setSourceText(text);
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("resume-analyses").upload(path, file, { contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      const pending = analyze({ data: { path, fileName: file.name, mimeType: mime, text } });
      const poll = setInterval(() => void qc.invalidateQueries({ queryKey: ["resume-analyses"] }), 1500);
      const res = await pending.finally(() => clearInterval(poll));
      if (!res.ok) throw new Error(`${res.error} Your credit was not used.`);
      toast.success("Resume analysis complete.");
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setRunning(false); await qc.invalidateQueries({ queryKey: ["resume-analyses"] }); }
  }

  return <div className="grid gap-6">
    <StudentPageHeading eyebrow="Career tools" title="Resume Builder" description="A clearer resume. A stronger first impression."><div className="border-l-2 border-success pl-4"><p className="text-3xl font-bold text-primary">{credits}</p><p className="text-xs text-muted-foreground">{credits ? "Resume credit available" : "Resume credit used"}</p></div></StudentPageHeading>

    {!done && <section className="section-card p-6">
      {running || processing ? <p className="text-sm text-primary" aria-live="polite">Resume analysis in progress</p> : <>
        <h2 className="text-xl font-bold">Upload your resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOC/DOCX or an image, up to 10 MB. You have one analysis; invalid or unreadable files do not use it.</p>
        <label className="mt-5 grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-primary/30 bg-secondary/40 p-10 text-center transition hover:bg-secondary">
          <span className="text-base font-semibold text-primary">Choose resume file</span><span className="mt-1 text-xs text-muted-foreground">Click to browse</span>
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" disabled={!credits} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {errorMsg && <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorMsg}</p>}
        {analyses.filter((a) => a.status === "failed").slice(0, 3).map((a) => <p key={a.id} className="mt-2 text-xs text-muted-foreground">Earlier attempt ({a.file_name}): {a.error}</p>)}
      </>}
    </section>}

    {(running || processing) && <DocumentAnalysisWorkspace kind="resume" file={file} previewUrl={previewUrl} fileName={processing?.file_name ?? file?.name} progress={(processing?.analysis_progress ?? null) as unknown as ReviewProgress | null} sourceText={sourceText ?? processing?.extracted_text} />}
    {done && !running && <Results report={done.report as unknown as Omit<ResumeReport, "improved_resume">} improved={done.improved_resume as unknown as Improved} fileName={done.file_name} evidence={<DocumentAnalysisWorkspace kind="resume" previewUrl={previewUrl} fileName={done.file_name} progress={(done.analysis_progress ?? { phase: "complete", sections: done.report, updatedAt: done.completed_at }) as unknown as ReviewProgress} sourceText={done.extracted_text} complete />} />}
  </div>;
}

function band(n: number) { return n >= 80 ? "Excellent" : n >= 65 ? "Good" : n >= 50 ? "Needs work" : "Weak"; }

function Results({ report, improved, fileName, evidence }: { report: Omit<ResumeReport, "improved_resume">; improved: Improved; fileName: string; evidence: ReactNode }) {
  const cats = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => ({ k, ...report.categories[k] }));
  const sorted = [...cats].sort((a, b) => b.score - a.score);
  return <div className="grid gap-6 animate-reveal">
    <section className="section-card overflow-hidden p-0">
      <div className="bg-gradient-panel grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex gap-5 text-primary"><ScoreRing value={report.overall_score} size={116} label="Resume score" tone="primary" /><ScoreRing value={report.ats_score} size={116} label="ATS score" tone="primary" /></div>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Detailed resume report</p><h2 className="mt-1 text-2xl font-bold">{report.candidate_name || "Your resume"} · {band(report.overall_score)}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.summary}</p></div>
        <dl className="grid grid-cols-3 gap-3 text-center md:grid-cols-1 md:text-right">
          <div><dt className="text-xs text-muted-foreground">Issues found</dt><dd className="text-2xl font-bold text-primary"><AnimatedNumber value={report.issues.length} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Lines rewritten</dt><dd className="text-2xl font-bold text-primary"><AnimatedNumber value={report.line_improvements.length} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Length</dt><dd className="text-sm font-semibold">{report.page_estimate} pg · {report.recommended_length}</dd></div>
        </dl>
      </div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2"><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-success">Strongest areas</span><p className="mt-1 font-semibold">{sorted.slice(0, 3).map((c) => CATEGORY_LABELS[c.k]).join(" · ")}</p></div><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-destructive">Fix first</span><p className="mt-1 font-semibold">{sorted.slice(-3).reverse().map((c) => CATEGORY_LABELS[c.k]).join(" · ")}</p></div></div>
    </section>

    <Tabs defaultValue="report">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="report">Full report</TabsTrigger><TabsTrigger value="lines">Line-by-line fixes</TabsTrigger><TabsTrigger value="keywords">Keywords</TabsTrigger><TabsTrigger value="resume">Recreated resume</TabsTrigger><TabsTrigger value="source">Source evidence</TabsTrigger></TabsList>

      <TabsContent value="report" className="grid gap-6">
        <section className="section-card p-6"><h2 className="text-xl font-bold">Category scores</h2>
          <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">{cats.map((c) => <div key={c.k}><div className="flex justify-between text-sm"><span className="font-semibold">{CATEGORY_LABELS[c.k]}</span><span className="font-bold text-primary"><AnimatedNumber value={c.score} /><span className="ml-1 text-xs font-normal text-muted-foreground">{band(c.score)}</span></span></div><GrowBar value={c.score} tone={c.score >= 65 ? "bg-success" : c.score >= 50 ? "bg-primary" : "bg-destructive"} className="mt-1.5" /><p className="mt-1 text-xs text-muted-foreground">{c.comment}</p></div>)}</div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">{([["Strengths", report.swot.strengths, "border-success"], ["Weaknesses", report.swot.weaknesses, "border-destructive"], ["Opportunities", report.swot.opportunities, "border-primary"], ["Threats", report.swot.threats, "border-accent"]] as const).map(([t, list, tone]) => <div key={t} className={`section-card border-t-4 p-5 ${tone}`}><h3 className="font-bold">{t}</h3><ol className="mt-3 grid gap-2 text-sm">{list.map((x, i) => <li key={i} className="flex gap-2"><span className="font-bold text-primary">{i + 1}.</span>{x}</li>)}</ol></div>)}</section>
        <section className="section-card p-6"><h2 className="text-xl font-bold">Issues to fix <span className="text-sm font-normal text-muted-foreground">({report.issues.length})</span></h2><div className="mt-4 grid gap-3">{report.issues.map((x, i) => <div key={i} className="grid gap-2 rounded-lg border p-4 text-sm"><p className="font-semibold"><span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-destructive/10 text-xs text-destructive">{i + 1}</span>{x.issue}</p><div className="grid gap-2 md:grid-cols-2"><p><span className="font-semibold text-muted-foreground">Impact: </span>{x.impact}</p><p><span className="font-semibold text-muted-foreground">Fix: </span>{x.fix}</p></div><p className="rounded-md bg-secondary p-2"><span className="font-semibold text-primary">Example: </span>{x.example}</p></div>)}</div></section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="section-card p-5"><h3 className="font-bold">Remove this</h3><ul className="mt-2 grid gap-2 text-sm">{report.remove_content.map((r, i) => <li key={i}><span className="line-through decoration-destructive">{r.text}</span><span className="block text-xs text-muted-foreground">{r.reason}</span></li>)}{!report.remove_content.length && <li className="text-muted-foreground">Nothing unnecessary found.</li>}</ul></div>
          <div className="section-card p-5"><h3 className="font-bold">Missing information</h3><ul className="mt-2 grid gap-1.5 text-sm">{report.missing_information.map((m, i) => <li key={i}>· {m}</li>)}</ul></div>
        </section>
        <section className="section-card p-6"><h2 className="text-xl font-bold">Action plan</h2><ol className="mt-3 grid gap-2 text-sm">{report.recommendations.map((r, i) => <li key={i} className="flex gap-3 rounded-md border p-3"><strong className="text-primary">{i + 1}</strong>{r}</li>)}</ol></section>
      </TabsContent>

      <TabsContent value="lines" className="grid gap-4">{report.line_improvements.map((l, i) => <div key={i} className="section-card p-5 text-sm">
        <p className="text-xs font-semibold uppercase text-primary">{l.section}</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2"><div className="rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-bold text-destructive">Instead of this</p><p className="mt-1">{l.original}</p></div><div className="rounded-md border border-success/40 bg-success/10 p-3"><p className="text-xs font-bold text-success">Write this</p><p className="mt-1">{l.improved}</p></div></div>
        <p className="mt-2 text-muted-foreground">{l.why}</p>{l.keywords.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{l.keywords.map((k) => <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{k}</span>)}</p>}
      </div>)}<p className="text-xs text-muted-foreground">Values in [brackets] are placeholders. Replace them with your real numbers.</p></TabsContent>

      <TabsContent value="keywords"><div className="section-card divide-y p-6">{report.keywords.map((k, i) => <div key={i} className="py-4"><p className="font-bold">{k.section}</p><p className="mt-2 flex flex-wrap gap-1.5">{k.keywords.map((w) => <span key={w} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{w}</span>)}</p><p className="mt-2 text-sm text-muted-foreground">Where to add: {k.where_to_add}</p></div>)}</div></TabsContent>

      <TabsContent value="resume"><ImprovedResume r={improved} /></TabsContent>
      <TabsContent value="source">{evidence}</TabsContent>
    </Tabs>
  </div>;
}

const esc = (s: string) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
// Standalone print document: single column, standard headings, real text — parsed cleanly by ATS.
function resumeHtml(r: Improved) {
  return `<html><head><meta charset="utf-8"><title>${esc(r.name)} - Resume</title><style>
@page{size:A4;margin:14mm 15mm}body{font-family:Calibri,Carlito,Arial,sans-serif;color:#111;max-width:760px;margin:0 auto;font-size:10.5pt;line-height:1.32}
h1{margin:0;font-size:22pt;letter-spacing:.5px;text-align:center}.contact{text-align:center;color:#333;font-size:9.5pt;margin-top:2px}.headline{text-align:center;font-weight:bold;margin-top:4px}
h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:1.2px;border-bottom:1.2px solid #1f3a5f;color:#1f3a5f;margin:12px 0 5px;padding-bottom:2px}
.row{display:flex;justify-content:space-between;gap:12px}.sub{font-style:italic;color:#333}ul{margin:2px 0 7px 16px;padding:0}li{margin:1px 0}p{margin:2px 0}
</style></head><body>
<h1>${esc(r.name)}</h1><p class="contact">${esc(r.contact)}</p>${r.headline ? `<p class="headline">${esc(r.headline)}</p>` : ""}
<h2>Professional Summary</h2><p>${esc(r.summary)}</p>
${r.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.entries.map((e) => `<div class="row"><b>${esc(e.heading)}</b><span>${esc(e.dates)}</span></div>${e.subheading ? `<p class="sub">${esc(e.subheading)}</p>` : ""}${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}`).join("")}`).join("")}
${r.skills.length ? `<h2>Skills</h2>${r.skills.map((g) => `<p><b>${esc(g.group)}:</b> ${g.items.map(esc).join(", ")}</p>`).join("")}` : ""}
</body></html>`;
}

function ImprovedResume({ r }: { r: Improved }) {
  function downloadWord() {
    const blob = new Blob([resumeHtml(r)], { type: "application/msword" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${r.name.replace(/\W+/g, "_") || "resume"}_ATS.doc`; a.click(); URL.revokeObjectURL(a.href);
  }
  function printPdf() { const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to save as PDF."); w.document.write(resumeHtml(r)); w.document.close(); w.focus(); w.print(); }
  const H = ({ children }: { children: ReactNode }) => <h3 className="mt-5 border-b-2 border-primary pb-0.5 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-primary">{children}</h3>;
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">ATS-friendly · single column · standard headings</p><p className="text-sm text-muted-foreground">Built only from your real information. Replace any [placeholders] before using it.</p></div><div className="flex gap-2"><Button variant="outline" onClick={downloadWord}>Download Word</Button><Button onClick={printPdf}>Save as PDF</Button></div></div>
    <div className="rounded-xl bg-muted/60 p-3 sm:p-8">
      <article className="mx-auto aspect-auto w-full max-w-[794px] bg-card px-6 py-8 text-[0.85rem] leading-snug text-foreground shadow-soft sm:px-14 sm:py-12">
        <header className="text-center"><h2 className="text-3xl font-bold tracking-wide">{r.name}</h2><p className="mt-1 text-xs text-muted-foreground">{r.contact}</p>{r.headline && <p className="mt-1.5 font-semibold">{r.headline}</p>}</header>
        <H>Professional Summary</H><p className="mt-1.5">{r.summary}</p>
        {r.sections.map((s) => <section key={s.title}><H>{s.title}</H>{s.entries.map((e, i) => <div key={i} className="mt-2"><div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{e.heading}</span><span className="text-xs font-semibold">{e.dates}</span></div>{e.subheading && <p className="italic text-muted-foreground">{e.subheading}</p>}{e.bullets.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}</div>)}</section>)}
        {r.skills.length > 0 && <><H>Skills</H>{r.skills.map((g) => <p key={g.group} className="mt-1"><span className="font-bold">{g.group}:</span> {g.items.join(", ")}</p>)}</>}
      </article>
    </div>
  </div>;
}
