import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/resume.functions";
import { ANALYSIS_STAGES, CATEGORY_LABELS, RESUME_FILE_TYPES, resumeCreditsLeft, type ResumeReport } from "@/lib/resume-analysis";
import { ScoreRing, GrowBar, AnimatedNumber } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const resumeAnalysesQuery = queryOptions({
  queryKey: ["resume-analyses"],
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
  const [stage, setStage] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const credits = resumeCreditsLeft(analyses);
  const done = analyses.find((a) => a.status === "completed");
  const processing = analyses.find((a) => a.status === "processing");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, ANALYSIS_STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [running]);

  async function upload(file: File | undefined) {
    setErrorMsg(null);
    if (!file) return;
    if (!RESUME_FILE_TYPES.test(file.name)) return setErrorMsg("Unsupported format. Upload a PDF, Word (DOC/DOCX) or image file.");
    if (file.size === 0) return setErrorMsg("This file is empty. Please upload your full resume.");
    if (file.size > 10 * 1024 * 1024) return setErrorMsg("File is larger than 10 MB.");
    setRunning(true); setStage(0);
    try {
      let text: string | null = null;
      let mime = file.type || "application/octet-stream";
      if (/\.docx?$/i.test(file.name)) {
        try { const mammoth = await import("mammoth"); text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim().slice(0, 60000); }
        catch { throw new Error("This Word file could not be read. Save it as PDF and try again."); }
        if (text.length < 80) throw new Error("This document looks blank or has too little text to be a resume.");
        mime = "application/msword";
      } else if (/\.pdf$/i.test(file.name)) mime = "application/pdf";
      setStage(1);
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("resume-analyses").upload(path, file, { contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      setStage(2);
      const res = await analyze({ data: { path, fileName: file.name, mimeType: mime, text } });
      if (!res.ok) throw new Error(`${res.error} Your credit was not used.`);
      setStage(ANALYSIS_STAGES.length);
      toast.success("Resume analysis complete.");
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setRunning(false); await qc.invalidateQueries({ queryKey: ["resume-analyses"] }); }
  }

  return <div className="grid gap-6">
    <section className="animate-reveal section-card flex flex-wrap items-end justify-between gap-4 p-6">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Career tools</p><h1 className="mt-1 text-3xl font-bold">Resume Builder</h1><p className="mt-1 text-sm text-muted-foreground">AI resume analysis, ATS score, SWOT, line-by-line rewrites and an ATS-friendly resume.</p></div>
      <div className="rounded-lg border bg-secondary px-5 py-3 text-center"><p className="text-2xl font-bold text-primary">{credits}</p><p className="text-xs font-semibold text-muted-foreground">{credits ? "Resume Credit Available" : "Resume credit used"}</p></div>
    </section>

    {!done && <section className="section-card p-6">
      {running || processing ? <AnalysisProgress stage={stage} waiting={!running} /> : <>
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

    {done && <Results report={done.report as unknown as Omit<ResumeReport, "improved_resume">} improved={done.improved_resume as unknown as Improved} fileName={done.file_name} />}
  </div>;
}

function AnalysisProgress({ stage, waiting }: { stage: number; waiting: boolean }) {
  return <div aria-live="polite">
    <h2 className="text-xl font-bold">Analysing your resume</h2>
    <p className="mt-1 text-sm text-muted-foreground">{waiting ? "Your analysis is still being processed. Refresh in a moment." : "This usually takes about a minute. Please keep this page open."}</p>
    <ol className="mt-5 grid gap-3">{ANALYSIS_STAGES.map((s, i) => {
      const state = i < stage ? "done" : i === stage ? "active" : "todo";
      return <li key={s} className="flex items-center gap-3">
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${state === "done" ? "bg-success text-primary-foreground" : state === "active" ? "animate-pulse bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
        <span className={`text-sm ${state === "todo" ? "text-muted-foreground" : "font-semibold"}`}>{s}{state === "active" && "…"}</span>
      </li>;
    })}</ol>
  </div>;
}

function Results({ report, improved, fileName }: { report: Omit<ResumeReport, "improved_resume">; improved: Improved; fileName: string }) {
  return <Tabs defaultValue="report">
    <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="report">Analysis report</TabsTrigger><TabsTrigger value="lines">Line-by-line fixes</TabsTrigger><TabsTrigger value="keywords">Keywords</TabsTrigger><TabsTrigger value="resume">ATS-friendly resume</TabsTrigger></TabsList>

    <TabsContent value="report" className="grid gap-6">
      <section className="section-card grid gap-6 p-6 md:grid-cols-[auto_1fr]">
        <div className="flex gap-6 text-primary"><ScoreRing value={report.overall_score} size={110} label="Resume score" tone="primary" /><ScoreRing value={report.ats_score} size={110} label="ATS score" tone="primary" /></div>
        <div><p className="text-xs text-muted-foreground">{fileName} · about {report.page_estimate} page{report.page_estimate === 1 ? "" : "s"} · Recommended: {report.recommended_length}</p><p className="mt-2 text-sm leading-relaxed">{report.summary}</p></div>
      </section>
      <section className="section-card p-6"><h2 className="text-xl font-bold">Category scores</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => { const c = report.categories[k]; return <div key={k}><div className="flex justify-between text-sm"><span className="font-semibold">{CATEGORY_LABELS[k]}</span><span className="font-bold text-primary"><AnimatedNumber value={c.score} /></span></div><GrowBar value={c.score} tone="bg-primary" className="mt-1.5" /><p className="mt-1 text-xs text-muted-foreground">{c.comment}</p></div>; })}</div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">{([["Strengths", report.swot.strengths, "border-success/40"], ["Weaknesses", report.swot.weaknesses, "border-destructive/40"], ["Opportunities", report.swot.opportunities, "border-primary/40"], ["Threats", report.swot.threats, "border-accent"]] as const).map(([t, list, tone]) => <div key={t} className={`section-card border-l-4 p-5 ${tone}`}><h3 className="font-bold">{t}</h3><ul className="mt-2 grid gap-1.5 text-sm">{list.map((x, i) => <li key={i}>· {x}</li>)}</ul></div>)}</section>
      <section className="section-card p-6"><h2 className="text-xl font-bold">Issues to fix</h2><div className="mt-3 divide-y">{report.issues.map((x, i) => <div key={i} className="grid gap-1 py-4 text-sm"><p className="font-semibold">{i + 1}. {x.issue}</p><p><span className="font-semibold text-muted-foreground">Impact: </span>{x.impact}</p><p><span className="font-semibold text-muted-foreground">Fix: </span>{x.fix}</p><p className="rounded-md bg-secondary p-2"><span className="font-semibold text-primary">Example: </span>{x.example}</p></div>)}</div></section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="section-card p-5"><h3 className="font-bold">Remove this</h3><ul className="mt-2 grid gap-2 text-sm">{report.remove_content.map((r, i) => <li key={i}><span className="line-through decoration-destructive">{r.text}</span><span className="block text-xs text-muted-foreground">{r.reason}</span></li>)}{!report.remove_content.length && <li className="text-muted-foreground">Nothing unnecessary found.</li>}</ul></div>
        <div className="section-card p-5"><h3 className="font-bold">Missing information</h3><ul className="mt-2 grid gap-1.5 text-sm">{report.missing_information.map((m, i) => <li key={i}>· {m}</li>)}</ul></div>
      </section>
      <section className="section-card p-6"><h2 className="text-xl font-bold">Recommendations</h2><ol className="mt-3 grid gap-2 text-sm">{report.recommendations.map((r, i) => <li key={i}><strong className="text-primary">{i + 1}.</strong> {r}</li>)}</ol></section>
    </TabsContent>

    <TabsContent value="lines" className="grid gap-4">{report.line_improvements.map((l, i) => <div key={i} className="section-card p-5 text-sm">
      <p className="text-xs font-semibold uppercase text-primary">{l.section}</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2"><div className="rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-bold text-destructive">Instead of this</p><p className="mt-1">{l.original}</p></div><div className="rounded-md border border-success/40 bg-success/10 p-3"><p className="text-xs font-bold text-success">Write this</p><p className="mt-1">{l.improved}</p></div></div>
      <p className="mt-2 text-muted-foreground">{l.why}</p>{l.keywords.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{l.keywords.map((k) => <span key={k} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{k}</span>)}</p>}
    </div>)}<p className="text-xs text-muted-foreground">Values in [brackets] are placeholders. Replace them with your real numbers; never add figures you can't back up.</p></TabsContent>

    <TabsContent value="keywords"><div className="section-card divide-y p-6">{report.keywords.map((k, i) => <div key={i} className="py-4"><p className="font-bold">{k.section}</p><p className="mt-2 flex flex-wrap gap-1.5">{k.keywords.map((w) => <span key={w} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{w}</span>)}</p><p className="mt-2 text-sm text-muted-foreground">Where to add: {k.where_to_add}</p></div>)}</div></TabsContent>

    <TabsContent value="resume"><ImprovedResume r={improved} /></TabsContent>
  </Tabs>;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function resumeHtml(r: Improved) {
  return `<html><head><meta charset="utf-8"><title>${esc(r.name)} - Resume</title><style>body{font-family:Calibri,Carlito,Arial,sans-serif;color:#111;max-width:780px;margin:24px auto;font-size:11pt;line-height:1.35}h1{margin:0;font-size:20pt}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #333;margin:14px 0 6px}.row{display:flex;justify-content:space-between}ul{margin:4px 0 8px 18px;padding:0}p{margin:2px 0}</style></head><body>
<h1>${esc(r.name)}</h1><p>${esc(r.contact)}</p><p><b>${esc(r.headline)}</b></p>
<h2>Summary</h2><p>${esc(r.summary)}</p>
${r.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.entries.map((e) => `<div class="row"><b>${esc(e.heading)}</b><span>${esc(e.dates)}</span></div>${e.subheading ? `<p><i>${esc(e.subheading)}</i></p>` : ""}<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`).join("")}`).join("")}
${r.skills.length ? `<h2>Skills</h2>${r.skills.map((g) => `<p><b>${esc(g.group)}:</b> ${g.items.map(esc).join(", ")}</p>`).join("")}` : ""}
</body></html>`;
}

function ImprovedResume({ r }: { r: Improved }) {
  function downloadWord() {
    const blob = new Blob([resumeHtml(r)], { type: "application/msword" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${r.name.replace(/\W+/g, "_") || "resume"}_ATS.doc`; a.click(); URL.revokeObjectURL(a.href);
  }
  function printPdf() { const w = window.open("", "_blank"); if (!w) return toast.error("Allow pop-ups to save as PDF."); w.document.write(resumeHtml(r)); w.document.close(); w.focus(); w.print(); }
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Built only from your real information. Review every line and replace any [placeholders] before using it.</p><div className="flex gap-2"><Button variant="outline" onClick={downloadWord}>Download Word</Button><Button onClick={printPdf}>Save as PDF</Button></div></div>
    <article className="section-card mx-auto w-full max-w-3xl bg-card p-8 text-sm">
      <h2 className="text-2xl font-bold">{r.name}</h2><p className="text-muted-foreground">{r.contact}</p><p className="mt-1 font-semibold text-primary">{r.headline}</p>
      <h3 className="mt-5 border-b pb-1 text-xs font-bold uppercase tracking-wider">Summary</h3><p className="mt-2">{r.summary}</p>
      {r.sections.map((s) => <div key={s.title}><h3 className="mt-5 border-b pb-1 text-xs font-bold uppercase tracking-wider">{s.title}</h3>{s.entries.map((e, i) => <div key={i} className="mt-3"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{e.heading}</span><span className="text-xs text-muted-foreground">{e.dates}</span></div>{e.subheading && <p className="italic text-muted-foreground">{e.subheading}</p>}<ul className="mt-1 list-disc pl-5">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</div>)}
      {r.skills.length > 0 && <><h3 className="mt-5 border-b pb-1 text-xs font-bold uppercase tracking-wider">Skills</h3>{r.skills.map((g) => <p key={g.group} className="mt-1"><span className="font-semibold">{g.group}:</span> {g.items.join(", ")}</p>)}</>}
    </article>
  </div>;
}
