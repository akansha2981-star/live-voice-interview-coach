import { StudentPageHeading } from "@/components/student-page-heading";
import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/resume.functions";
import { CATEGORY_LABELS, RESUME_FILE_TYPES, isStalled, resumeCreditsLeft, type ResumeReport } from "@/lib/resume-analysis";
import { DocumentAnalysisWorkspace } from "@/components/document-analysis-workspace";
import type { ReviewProgress } from "@/lib/document-progress";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import { ScoreRing, GrowBar, AnimatedNumber } from "@/components/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const resumeAnalysesQuery = queryOptions({
  queryKey: ["resume-analyses"],
  refetchInterval: (query) => query.state.data?.some((r) => r.status === "processing" && !isStalled(r)) ? 1500 : false,
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("resume_analyses").select("*").eq("user_id", u.user?.id ?? "").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/resume-builder")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Resume Builder — MBA Compass AI Interview" }, { name: "description", content: "AI resume analysis with an ATS score, SWOT, keyword gaps and line-by-line feedback." }, { property: "og:title", content: "Resume Builder — MBA Compass" }, { property: "og:description", content: "Analyse your resume and get clear, actionable feedback." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resumeAnalysesQuery),
  component: ResumeBuilder,
});

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
  const processing = analyses.find((a) => a.status === "processing" && !isStalled(a));
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
      if (!res.ok) throw new Error(res.error ?? "Analysis failed. Please try again.");
      toast.success("Resume analysis complete.");
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setRunning(false); await qc.invalidateQueries({ queryKey: ["resume-analyses"] }); }
  }

  return <div className="grid gap-6">
    <StudentPageHeading eyebrow="Career tools" title="Resume Builder" description="A clearer resume. A stronger first impression."><div className="border-l-2 border-success pl-4"><p className="text-3xl font-bold text-primary">Free</p><p className="text-xs text-muted-foreground">{credits ? "Review your resume anytime" : "Review in progress"}</p></div></StudentPageHeading>

    {!(running || processing) && <section className="section-card p-6">
      <>
        <h2 className="text-xl font-bold">Upload your resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOC/DOCX or an image, up to 10 MB. Detailed analysis and feedback are free. Review one file at a time.</p>
        <label className="mt-5 grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-primary/30 bg-secondary/40 p-10 text-center transition hover:bg-secondary">
          <span className="text-base font-semibold text-primary">Choose resume file</span><span className="mt-1 text-xs text-muted-foreground">Click to browse</span>
          <input type="file" className="sr-only" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" disabled={!credits} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {errorMsg && <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorMsg}</p>}
        {analyses.filter((a) => a.status === "failed").slice(0, 3).map((a) => <p key={a.id} className="mt-2 text-xs text-muted-foreground">Earlier attempt ({a.file_name}): {a.error}</p>)}
      </>
    </section>}

    {(running || processing) && <DocumentAnalysisWorkspace kind="resume" file={file} previewUrl={previewUrl} fileName={processing?.file_name ?? file?.name} progress={(processing?.analysis_progress ?? null) as unknown as ReviewProgress | null} sourceText={sourceText ?? processing?.extracted_text} />}
    {done && !running && <Results report={done.report as unknown as ResumeReport} fileName={done.file_name} evidence={<DocumentAnalysisWorkspace kind="resume" previewUrl={previewUrl} fileName={done.file_name} progress={(done.analysis_progress ?? { phase: "complete", sections: done.report, updatedAt: done.completed_at }) as unknown as ReviewProgress} sourceText={done.extracted_text} complete />} />}
  </div>;
}

function band(n: number) { return n >= 80 ? "Excellent" : n >= 65 ? "Good" : n >= 50 ? "Needs work" : "Weak"; }

function Results({ report, fileName, evidence }: { report: ResumeReport; fileName: string; evidence: ReactNode }) {
  const cats = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((k) => ({ k, ...report.categories[k] }));
  const sorted = [...cats].sort((a, b) => b.score - a.score);
  return <div className="grid gap-6 animate-reveal">
    <section className="section-card overflow-hidden p-0">
      <div className="bg-gradient-panel flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:p-8">
        <div className="flex shrink-0 gap-5 text-primary"><ScoreRing value={report.overall_score} size={116} label="Resume score" tone="primary" /><ScoreRing value={report.ats_score} size={116} label="ATS score" tone="primary" /></div>
        <div className="min-w-0 flex-1"><p className="student-eyebrow">Detailed resume report</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">{report.candidate_name || "Your resume"} <span className="text-primary">· {band(report.overall_score)}</span></h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{report.summary}</p></div>
      </div>
      <dl className="grid grid-cols-3 gap-px border-t bg-border">
        <div className="bg-card px-5 py-4"><dt className="text-xs font-semibold uppercase text-muted-foreground">Issues found</dt><dd className="mt-1 text-2xl font-bold text-primary"><AnimatedNumber value={report.issues.length} /></dd></div>
        <div className="bg-card px-5 py-4"><dt className="text-xs font-semibold uppercase text-muted-foreground">Lines improved</dt><dd className="mt-1 text-2xl font-bold text-primary"><AnimatedNumber value={report.line_improvements.length} /></dd></div>
        <div className="min-w-0 bg-card px-5 py-4"><dt className="text-xs font-semibold uppercase text-muted-foreground">Length</dt><dd className="mt-1 text-sm font-semibold">{report.page_estimate} page · {report.recommended_length}</dd></div>
      </dl>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2"><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-success">Strongest areas</span><p className="mt-1 font-semibold">{sorted.slice(0, 3).map((c) => CATEGORY_LABELS[c.k]).join(" · ")}</p></div><div className="bg-card p-4 text-sm"><span className="text-xs font-semibold uppercase text-destructive">Fix first</span><p className="mt-1 font-semibold">{sorted.slice(-3).reverse().map((c) => CATEGORY_LABELS[c.k]).join(" · ")}</p></div></div>
    </section>

    <Tabs defaultValue="report">
      <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="report">Full report</TabsTrigger><TabsTrigger value="lines">Line-by-line fixes</TabsTrigger><TabsTrigger value="keywords">Keywords</TabsTrigger><TabsTrigger value="source">Source evidence</TabsTrigger></TabsList>

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

      <TabsContent value="source">{evidence}</TabsContent>
    </Tabs>
  </div>;
}
