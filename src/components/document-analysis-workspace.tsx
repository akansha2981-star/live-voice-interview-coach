import { useEffect, useState } from "react";
import { evidenceFacts, exactQuoteRange, type ReviewProgress } from "@/lib/document-progress";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/motion";
import { DocumentAnalysisActivity } from "@/components/document-analysis-activity";

type Stage = { label: string; detail: string; done: boolean };

/** Every stage completes only when the matching real result has been received. */
function buildStages(kind: "resume" | "sop", progress: ReviewProgress | null | undefined, complete: boolean): Stage[] {
  const s = progress?.sections ?? {};
  const has = (k: string) => complete || s[k] !== undefined;
  const started = complete || Boolean(progress);
  const read = complete || progress?.phase === "analysing" || progress?.phase === "complete";
  const common: Stage[] = [
    { label: "Uploading securely", detail: "Sending your file to private storage", done: started },
    { label: "Reading document", detail: "Opening pages and recognising the text", done: read },
    { label: "Extracting content", detail: "Pulling out education, experience and key facts", done: has("document_evidence") },
  ];
  if (kind === "resume") return [...common,
    { label: "Scoring 12 categories", detail: "ATS, formatting, impact, skills and more", done: has("categories") },
    { label: "SWOT analysis", detail: "Strengths, weaknesses, opportunities, threats", done: has("swot") },
    { label: "Checking issues", detail: "Finding gaps and unnecessary points", done: has("remove_content") },
    { label: "Rewriting weak lines", detail: "Action verbs, structure and clarity", done: has("line_improvements") },
    { label: "Evaluating keywords", detail: "ATS keywords for each section", done: has("keywords") },
  ];
  return [...common,
    { label: "Scoring 13 categories", detail: "Clarity, storytelling, motivation, goals and fit", done: has("categories") },
    { label: "Strengths & weaknesses", detail: "What works and what holds the SOP back", done: has("opportunities") },
    { label: "Checking every sentence", detail: "Vague, generic or weak lines with fixes", done: has("line_feedback") },
    { label: "Add, remove & strengthen", detail: "Exact points to change", done: has("strengthen_points") },
    { label: "College fit check", detail: "Matching the selected college's expectations", done: has("college_fit_notes") },
    { label: "Rewriting your SOP", detail: "A polished version in your own voice", done: complete },
  ];
}

export function DocumentAnalysisWorkspace({ kind, file, fileName, previewUrl, progress, sourceText, complete = false }: {
  kind: "resume" | "sop"; file?: File | null; fileName?: string; previewUrl?: string | null; progress?: ReviewProgress | null; sourceText?: string | null; complete?: boolean;
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
  const stages = buildStages(kind, progress, complete);
  const failed = progress?.phase === "failed";
  const doneCount = stages.filter((x) => x.done).length;
  const activeStage = complete || failed ? -1 : stages.findIndex((x) => !x.done);
  const pct = Math.round((doneCount / stages.length) * 100);
  const fixes = (kind === "resume" ? sections.line_improvements : sections.line_feedback) as Array<{ original: string; improved?: string; suggestion?: string; why?: string }> | undefined;
  const mediaUrl = url || previewUrl;
  const image = file?.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fileName ?? "");
  const pdf = /\.pdf$/i.test(file?.name ?? fileName ?? "");
  const scanning = !complete && !failed;

  return <section className={`section-card grid min-w-0 gap-6 overflow-hidden p-0 animate-reveal ${kind === "resume" && scanning ? "resume-analysis-active" : ""}`} aria-label={`${kind === "resume" ? "Resume" : "SOP"} analysis`} aria-busy={scanning}>
    {!complete && <header className="bg-gradient-panel border-b px-6 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-primary">AI {kind === "resume" ? "resume" : "SOP"} analysis</p>
          <h2 className="mt-1 text-2xl font-bold">{failed ? "Analysis stopped" : activeStage >= 0 ? <span className={scanning ? "text-shimmer" : ""}>{stages[activeStage].label}…</span> : "Finishing up…"}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{failed ? "Something went wrong. Your credit was not used." : activeStage >= 0 ? stages[activeStage].detail : ""} · {fileName || file?.name}</p></div>
        <div className="text-right"><p className="text-4xl font-bold tabular-nums text-primary">{doneCount}<span className="text-lg text-muted-foreground"> / {stages.length}</span></p><p className="text-xs text-muted-foreground">steps complete</p></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full transition-all duration-700 ${failed ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.max(pct, 4)}%` }} /></div>
    </header>}

    <div className="grid min-w-0 gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [&:first-child]:pt-6">
      {kind === "resume" && !complete ? <div className="min-w-0">
        {scanning && <DocumentAnalysisActivity stage={activeStage >= 0 ? stages[activeStage].label : "Finalising your report"} detail={activeStage >= 0 ? stages[activeStage].detail : "Preparing your results"} facts={evidence?.facts.length ?? 0} sections={Object.keys(sections).length} fixes={fixes?.length ?? 0} />}
        <div className="mt-6 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Resume assessment</h3><span className="text-xs font-semibold text-muted-foreground">Provisional · not final</span></div>
          {typeof sections.overall_score === "number" ? <div className="mt-4 grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center animate-reveal">
            <ScoreRing value={sections.overall_score} size={112} label="Out of 100" tone="primary" />
            <div className="min-w-0"><p className="text-sm font-semibold text-primary">Initial resume score</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{typeof sections.summary === "string" ? sections.summary : "Your initial score has arrived. Detailed findings are still being prepared."}</p><p className="mt-3 text-xs text-muted-foreground">The completed report will contain your final assessment.</p></div>
          </div> : <div className="mt-4 border-l-2 border-primary pl-4"><p className="font-semibold">Assessment pending</p><p className="mt-1 text-sm text-muted-foreground">Your score will appear when the analysis returns it.</p></div>}
        </div>
        {quote && <div className="mt-6 border-t pt-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Source evidence</h3><Button size="sm" variant="ghost" onClick={() => setQuote("")}>Clear selection</Button></div><blockquote className="mt-3 break-words border-l-2 border-primary pl-4 text-sm leading-relaxed">{range ? text.slice(range.start, range.end) : "This quote could not be located in the source."}</blockquote></div>}
      </div> : <article className="relative min-w-0 overflow-hidden rounded-lg border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b px-4 py-3"><h3 className="text-sm font-semibold">{quote ? "Source evidence" : "Your document"}</h3>{quote && <Button size="sm" variant="ghost" onClick={() => setQuote("")}>Clear selection</Button>}</div>
        <div className="relative h-[28rem] overflow-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
          {quote || (!mediaUrl && text) || (mediaUrl && !image && !pdf && text) ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{range ? <>{text.slice(0, range.start)}<mark className="bg-accent/30 text-foreground">{text.slice(range.start, range.end)}</mark>{text.slice(range.end)}</> : text}</p>
            : mediaUrl && image ? <img src={mediaUrl} alt="Uploaded document" className="h-full w-full object-contain" />
            : mediaUrl && pdf ? <object data={mediaUrl} type="application/pdf" aria-label="Uploaded PDF" className="h-full w-full"><a href={mediaUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open uploaded PDF</a></object>
            : <div className="grid h-full content-center gap-3 text-center"><p className="font-semibold">{failed ? "No results available" : complete ? "Preview unavailable" : "Preparing preview"}</p></div>}
        </div>
        {scanning && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-12 bottom-0 overflow-hidden"><div className="animate-scan h-16 w-full bg-gradient-to-b from-transparent via-primary/15 to-transparent" /></div>}
      </article>}

      <div className="grid min-w-0 content-start gap-5">
        {!complete && <ol className="grid gap-1" aria-live="polite">{stages.map((stage, i) => {
          const active = i === activeStage;
          return <li key={stage.label} className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${active ? "bg-secondary" : ""}`}>
            <span className={`relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${stage.done ? "bg-success text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {String(i + 1).padStart(2, "0")}{active && <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 motion-safe:animate-ping" />}
            </span>
            <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${stage.done || active ? "" : "text-muted-foreground"}`}>{stage.label}</span>{active && <span className="block truncate text-xs text-muted-foreground">{stage.detail}</span>}</span>
            <span className={`text-xs font-semibold ${stage.done ? "text-success" : active ? "text-primary" : "text-muted-foreground"}`}>{stage.done ? "Done" : failed ? "Stopped" : active ? "Working" : "Queued"}</span>
          </li>;
        })}</ol>}
        {kind !== "resume" && typeof sections.overall_score === "number" && !complete && <div className="flex items-center gap-5 rounded-lg border p-4 animate-reveal"><ScoreRing value={sections.overall_score} size={80} label="Early score" tone="primary" /><p className="text-sm text-muted-foreground">{typeof sections.summary === "string" ? sections.summary : "Detailed feedback on the way."}</p></div>}
        <div><h3 className="text-base font-bold">Extracted from your {kind === "resume" ? "resume" : "SOP"}</h3>{evidence ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{evidence.facts.map((fact, i) => <Button key={`${fact.label}-${i}`} variant="outline" onClick={() => setQuote(fact.quote)} className="h-auto min-w-0 flex-col items-start gap-1 whitespace-normal p-3 text-left animate-reveal"><span className="text-xs text-muted-foreground">{fact.label}</span><span className="max-w-full break-words text-sm font-semibold">{fact.value}</span></Button>)}{!evidence.facts.length && <p className="text-sm text-muted-foreground">No facts found.</p>}</div> : <p className="mt-2 text-sm text-muted-foreground">{complete ? "Source evidence was not saved with this review." : "Facts will appear here as soon as they are extracted."}</p>}</div>
      </div>
    </div>
    {fixes && !complete && <div className="px-6 pb-6"><h3 className="text-lg font-bold">First suggestions <span className="ml-1 text-xs font-normal text-muted-foreground">Provisional</span></h3><div className="mt-3 grid gap-3 md:grid-cols-2">{fixes.slice(0, 4).map((fix, i) => <article key={i} className="min-w-0 rounded-md border bg-card p-4 animate-reveal"><p className="break-words border-l-2 border-destructive/40 pl-3 text-sm">{fix.original}</p><p className="mt-2 break-words border-l-2 border-success pl-3 text-sm">{fix.improved || fix.suggestion}</p></article>)}</div></div>}
  </section>;
}
