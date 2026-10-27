import { useEffect, useState } from "react";
import { evidenceFacts, exactQuoteRange, type ReviewProgress } from "@/lib/document-progress";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/motion";

export function DocumentAnalysisWorkspace({ kind, file, fileName, progress, sourceText, complete = false }: {
  kind: "resume" | "sop"; file?: File | null; fileName?: string; progress?: ReviewProgress | null; sourceText?: string | null; complete?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const objectUrl = URL.createObjectURL(file); setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const sections = progress?.sections ?? {};
  const evidence = evidenceFacts(sections.document_evidence);
  const text = sourceText || evidence?.source_text || "";
  const range = exactQuoteRange(text, quote);
  const categories = sections.categories as Record<string, { score: number; comment: string }> | undefined;
  const stages = kind === "resume" ? [
    { label: "Document reading", done: Boolean(evidence), key: "document_evidence" },
    { label: "Experience & education", done: Boolean(evidence), key: "document_evidence" },
    { label: "ATS compatibility", done: Boolean(categories?.ats_compatibility), key: "categories" },
    { label: "Keyword review", done: Boolean(sections.keywords), key: "keywords" },
    { label: "Sentence improvements", done: Boolean(sections.line_improvements), key: "line_improvements" },
  ] : [
    { label: "Document reading", done: Boolean(evidence), key: "document_evidence" },
    { label: "College-specific fit", done: Boolean(categories?.college_fit), key: "categories" },
    { label: "Storytelling & motivation", done: Boolean(categories?.storytelling && categories?.motivation), key: "categories" },
    { label: "Career goals & writing", done: Boolean(categories?.career_goals && categories?.grammar), key: "categories" },
    { label: "Specificity & improvements", done: Boolean(sections.line_feedback), key: "line_feedback" },
  ];
  const fixes = (kind === "resume" ? sections.line_improvements : sections.line_feedback) as Array<{ original: string; improved?: string; suggestion?: string; why?: string }> | undefined;
  const failed = progress?.phase === "failed";
  const image = file?.type.startsWith("image/");
  const pdf = file && /\.pdf$/i.test(file.name);
  return <section className="grid min-w-0 gap-6 border-y py-6 animate-reveal" aria-label={`${kind === "resume" ? "Resume" : "SOP"} analysis workspace`}>
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Document intelligence</p><h2 className="mt-1 text-2xl font-bold">{complete ? "Your evidence, in focus" : "Your document, under review"}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{fileName || file?.name || "Private document"}</p></div><span className={`border-l-2 pl-3 text-sm font-semibold ${failed ? "border-destructive text-destructive" : "border-primary text-primary"}`}>{failed ? "Analysis stopped" : complete ? "Review complete" : progress?.phase === "reading" ? "Reading document" : progress?.phase === "analysing" ? "Analysis in progress" : "Uploading document"}</span></header>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <article className="min-w-0 border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3"><h3 className="text-sm font-semibold">{quote ? "Source evidence" : "Document preview"}</h3>{quote && <Button size="sm" variant="ghost" onClick={() => setQuote("")}>Clear selection</Button>}</div>
        <div className="h-[28rem] overflow-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
          {quote || (!url && text) || (url && !image && !pdf && text) ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{range ? <>{text.slice(0, range.start)}<mark className="bg-accent/30 text-foreground">{text.slice(range.start, range.end)}</mark>{text.slice(range.end)}</> : text}</p>
            : url && image ? <img src={url} alt="Uploaded document" className="h-full w-full object-contain" />
            : url && pdf ? <object data={url} type="application/pdf" aria-label="Uploaded PDF" className="h-full w-full"><p className="text-sm text-muted-foreground">PDF preview is unavailable in this browser.</p><a href={url} target="_blank" rel="noreferrer" className="text-primary underline">Open uploaded PDF</a></object>
            : <div className="grid h-full content-center gap-3 text-center"><p className="font-semibold">{failed ? "No document results available" : "Source text pending"}</p><p className="text-sm text-muted-foreground">{failed ? "Try your submission again." : "Extracted passages will appear after document reading."}</p></div>}
        </div>
      </article>
      <div className="grid min-w-0 content-start gap-5">
        <ol className="grid gap-0 border-y" aria-live="polite">{stages.map((stage, i) => <li key={stage.label} className="flex items-center gap-3 border-b py-3 last:border-0"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${stage.done ? "bg-success/15 text-success" : "bg-secondary text-primary"}`}>{i + 1}</span><span className="flex-1 text-sm font-semibold">{stage.label}</span><span className={`text-xs ${stage.done ? "text-success" : "text-muted-foreground"}`}>{stage.done ? complete ? "Complete" : "Received · provisional" : failed ? "Not completed" : complete ? "Not available" : "Pending"}</span></li>)}</ol>
        {typeof sections.overall_score === "number" && <div className="flex items-center gap-5"><ScoreRing value={sections.overall_score} size={90} label="Overall score" tone="primary" /><p className="text-sm leading-relaxed text-muted-foreground">{typeof sections.summary === "string" ? sections.summary : complete ? "Review completed." : "Detailed feedback pending."}</p></div>}
        <div><h3 className="text-base font-bold">Extracted from your {kind === "resume" ? "resume" : "SOP"}</h3>{evidence ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{evidence.facts.map((fact, i) => <Button key={`${fact.label}-${i}`} variant="outline" onClick={() => setQuote(fact.quote)} className="h-auto min-w-0 flex-col items-start gap-1 whitespace-normal p-3 text-left"><span className="text-xs text-muted-foreground">{fact.label}</span><span className="max-w-full break-words text-sm font-semibold">{fact.value}</span></Button>)}{!evidence.facts.length && <p className="text-sm text-muted-foreground">No evidence-backed facts found.</p>}</div> : <p className="mt-2 text-sm text-muted-foreground">{complete ? "Source evidence was not saved with this review." : "Waiting for extraction results."}</p>}</div>
      </div>
    </div>
    {fixes && <div><h3 className="text-xl font-bold">Sentence review{!complete && <span className="ml-2 text-xs font-normal text-muted-foreground">Provisional results</span>}</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{fixes.map((fix, i) => <article key={i} className="min-w-0 border bg-card p-4 animate-reveal"><p className="text-xs font-semibold text-muted-foreground">{i + 1}. Original passage</p><p className="mt-2 break-words border-l-2 border-destructive/40 pl-3 text-sm">{fix.original}</p><p className="mt-3 text-xs font-semibold text-success">Suggested replacement</p><p className="mt-1 break-words text-sm">{fix.improved || fix.suggestion}</p>{fix.why && <p className="mt-2 text-xs text-muted-foreground">{fix.why}</p>}{exactQuoteRange(text, fix.original) && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setQuote(fix.original)}>Show in document</Button>}</article>)}</div></div>}
  </section>;
}