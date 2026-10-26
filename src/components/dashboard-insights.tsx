import { Fragment, useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { benchmarkQuery, myReportsQuery, myReviewsQuery } from "@/lib/queries";
import { MIN_COMPARISON_SAMPLE, SECTIONS, compareLatest, fmtTime, journey, pctStatus, reviewItems, splitReviews, strongestWeakest, topPriorities, weakestArea, type ScoredInterview, type Status } from "@/lib/dashboard-insights";
import type { VisionSummary } from "@/lib/vision";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { GrowBar } from "@/components/motion";

const Tag = ({ kind }: { kind: "measured" | "ai" }) => <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${kind === "measured" ? "bg-secondary text-primary" : "bg-accent/30 text-foreground"}`}>{kind === "measured" ? "Measured" : "AI feedback"}</span>;
const signed = (n: number | null) => n == null ? "—" : `${n > 0 ? "+" : ""}${n}`;
const date = (d: string) => new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

export function DashboardInsights() {
  const { data: rows } = useSuspenseQuery(myReportsQuery);
  const { data: reviews } = useSuspenseQuery(myReviewsQuery);
  const all = rows as unknown as Array<ScoredInterview & { category: string | null; vision_summary: VisionSummary | null; speech_metrics: Record<string, unknown> | null }>;
  const chrono = journey(all);
  const latest = chrono.at(-1) as (typeof all)[number] | undefined;
  const bench = useQuery(benchmarkQuery(latest?.category ?? null));
  const cmp = compareLatest(chrono);
  const reviewedSet = useMemo(() => new Set(reviews.map((r) => `${r.interview_id}:${r.question_index}`)), [reviews]);
  const items = reviewItems(chrono);
  const { pending, done } = splitReviews(items, reviewedSet);

  if (!latest) return <section className="rounded-lg border bg-card p-6 text-center"><h2 className="text-xl font-bold">Your insights will appear here</h2><p className="mt-2 text-sm text-muted-foreground">Complete your first interview to see scores, answer reviews and your improvement plan.</p><Button asChild className="mt-4"><Link to="/slots">Book an interview</Link></Button></section>;

  const report = latest.report!;
  const cats = report.category_scores ?? { resume: null, practical: null, general_knowledge: null };
  const sw = strongestWeakest(cats);
  const b = bench.data;
  const enough = b && b.sample_size >= MIN_COMPARISON_SAMPLE && b.avg_overall != null;
  const diff = enough ? Math.round((latest.overall_score ?? 0) - Number(b!.avg_overall)) : null;

  const top = [
    { label: "Your latest score", value: latest.overall_score ?? "—", note: date(latest.started_at) },
    { label: "Average user score", value: enough ? Math.round(Number(b!.avg_overall)) : "—", note: bench.isLoading ? "Loading…" : enough ? `${b!.sample_size} anonymous interviews` : "Not enough comparison data" },
    { label: "Score difference", value: signed(diff), note: diff == null ? "Needs comparison data" : diff >= 0 ? "Above average" : "Below average" },
    { label: "Progress score", value: signed(cmp?.delta ?? null), note: cmp?.previous ? "Vs previous interview" : "No previous interview yet" },
    { label: "Questions reviewed", value: `${done.length}/${items.length}`, note: `${pending.length} pending` },
    { label: "Top improvement area", value: sw.weakest?.label ?? weakestArea(report) ?? "—", note: "Needs the most attention", small: true },
  ];

  return <div className="grid min-w-0 gap-6">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{top.map((t) => <div key={t.label} className="rounded-lg border bg-card p-4 shadow-soft"><p className="text-xs font-semibold text-muted-foreground">{t.label}</p><p className={`mt-2 font-bold text-primary ${t.small ? "text-base leading-tight" : "text-2xl tabular-nums"}`}>{t.value}</p><p className="mt-1 text-xs text-muted-foreground">{t.note}</p></div>)}</div>

    <section className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Interview performance tracker</h2><Tag kind="ai" /></div>
      <p className="mt-1 text-sm text-muted-foreground">Three sections, three questions each.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">{SECTIONS.map((s) => { const v = cats[s.key]; return <div key={s.key} className={`rounded-md border p-4 ${sw.strongest?.key === s.key ? "border-success" : sw.weakest?.key === s.key ? "border-destructive/60" : ""}`}><div className="flex justify-between text-sm"><span className="font-semibold">{s.label}</span><span className="font-bold tabular-nums">{v ?? "—"}{v != null && "/100"}</span></div><GrowBar value={v ?? 0} tone="bg-primary" className="mt-3" /><p className="mt-2 text-xs text-muted-foreground">{v == null ? "Not scored in this interview" : sw.strongest?.key === s.key ? "Strongest area" : sw.weakest?.key === s.key ? "Weakest area" : "\u00a0"}</p></div>; })}</div>
    </section>

    <ReviewSection pending={pending} done={done} />

    <Accordion type="multiple" defaultValue={["moments", "plan"]} className="grid gap-4">
      <AccordionItem value="moments" className="rounded-lg border bg-card px-5"><AccordionTrigger className="text-lg font-bold">Moments to improve</AccordionTrigger><AccordionContent><Moments report={report} /></AccordionContent></AccordionItem>
      <AccordionItem value="presentation" className="rounded-lg border bg-card px-5"><AccordionTrigger className="text-lg font-bold">Posture and presentation</AccordionTrigger><AccordionContent><Presentation v={latest.vision_summary} sp={latest.speech_metrics} /></AccordionContent></AccordionItem>
      <AccordionItem value="journey" className="rounded-lg border bg-card px-5"><AccordionTrigger className="text-lg font-bold">Your interview journey</AccordionTrigger><AccordionContent><Journey chrono={chrono} cmp={cmp} /></AccordionContent></AccordionItem>
      <AccordionItem value="compare" className="rounded-lg border bg-card px-5"><AccordionTrigger className="text-lg font-bold">Average user score comparison</AccordionTrigger><AccordionContent>
        {bench.isError ? <p className="text-sm text-destructive">Could not load comparison data.</p> : !enough ? <p className="text-sm text-muted-foreground">Not enough comparison data. At least {MIN_COMPARISON_SAMPLE} completed interviews from other students are needed (currently {b?.sample_size ?? 0}).</p> : <div className="grid gap-2 text-sm">
          <p className="text-xs text-muted-foreground">Anonymous averages from {b!.sample_size} interviews{b!.scope === "category" ? " of the same interview type" : " across all interview types"}. No other student's identity, answers or reports are shown.</p>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-2"><span className="font-semibold">Area</span><span className="font-semibold">You</span><span className="font-semibold">Average</span><span className="font-semibold">Difference</span>
            {[["Overall", latest.overall_score, b!.avg_overall], ["Resume-based", cats.resume, b!.avg_resume], ["Practical", cats.practical, b!.avg_practical], ["General knowledge", cats.general_knowledge, b!.avg_general], ["Communication", report.scores.communication.score, b!.avg_communication]].map(([l, y, a]) => <Fragment key={l as string}><span>{l as string}</span><span className="tabular-nums">{y ?? "—"}</span><span className="tabular-nums">{a == null ? "—" : Math.round(Number(a))}</span><span className="tabular-nums">{y == null || a == null ? "—" : signed(Math.round(Number(y) - Number(a)))}</span></Fragment>)}
          </div></div>}
      </AccordionContent></AccordionItem>
      <AccordionItem value="plan" className="rounded-lg border bg-card px-5"><AccordionTrigger className="text-lg font-bold">What you should improve next</AccordionTrigger><AccordionContent>
        <ol className="grid gap-3">{topPriorities(report).map((p, i) => <li key={i} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><div><p className="font-semibold">{p.area}</p>{p.exercise && <p className="text-sm text-muted-foreground">Exercise: {p.exercise}</p>}</div></li>)}</ol>
        <p className="mt-3 text-xs text-muted-foreground">Based on your latest report · updates after every interview.</p>
      </AccordionContent></AccordionItem>
    </Accordion>
  </div>;
}

function ReviewSection({ pending, done }: { pending: ReturnType<typeof reviewItems>; done: ReturnType<typeof reviewItems> }) {
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const list = showDone ? done : pending;
  const item = list[Math.min(idx, Math.max(0, list.length - 1))];
  const mark = useMutation({
    mutationFn: async (it: NonNullable<typeof item>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("answer_reviews").insert({ user_id: u.user!.id, interview_id: it.interviewId, question_index: it.index });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["answer_reviews"] }),
    onError: () => toast.error("Could not save review. Please try again."),
  });
  const q = item?.q;
  return <section className="rounded-lg border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Review your answers</h2><div className="flex gap-2"><Button size="sm" variant={!showDone ? "secondary" : "ghost"} onClick={() => { setShowDone(false); setIdx(0); }}>Pending ({pending.length})</Button><Button size="sm" variant={showDone ? "secondary" : "ghost"} onClick={() => { setShowDone(true); setIdx(0); }}>Reviewed ({done.length})</Button></div></div>
    {!item || !q ? <p className="mt-4 text-sm text-muted-foreground">{showDone ? "No reviewed answers yet." : "All caught up — no pending feedback."}</p> : <div className="mt-4 grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{date(item.date)}</span><span>· at {fmtTime(q.timestamp_s)}</span>{q.section && <span>· {SECTIONS.find((s) => s.key === q.section)?.label ?? "Follow-up"}</span>}<span className="ml-auto font-bold text-primary">Score {q.score}/100</span><Tag kind="ai" /></div>
      <div><p className="text-xs font-semibold uppercase text-primary">Question asked</p><p className="mt-1 font-semibold">{q.question}</p></div>
      <div className="border-l-2 border-primary bg-secondary px-3 py-2"><p className="text-xs font-semibold uppercase text-primary">Your answer</p><p className="mt-1 text-sm">{q.quote || q.answer_summary}</p></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase text-success">What you did well</p><p className="mt-1 text-sm">{q.went_well || "—"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-destructive">What went wrong</p><p className="mt-1 text-sm">{q.went_wrong || q.evaluation}</p></div>
      </div>
      <div><p className="text-xs font-semibold uppercase text-primary">How to improve</p><p className="mt-1 text-sm">{q.recommendation || q.practice}</p></div>
      <div className="rounded-md border p-3"><p className="text-xs font-semibold uppercase text-primary">Better sample answer</p><p className="mt-1 text-sm">{q.improved_answer}</p></div>
      <div className="flex flex-wrap justify-end gap-2">
        {!showDone && <Button disabled={mark.isPending} onClick={() => mark.mutate(item)}>Mark as reviewed</Button>}
        <Button variant="outline" disabled={list.length < 2} onClick={() => setIdx((i) => (i + 1) % list.length)}>Next review</Button>
      </div>
    </div>}
  </section>;
}

function Moments({ report }: { report: NonNullable<ScoredInterview["report"]> }) {
  const all = [...(report.measured_moments ?? []).map((m) => ({ ...m, src: "measured" as const })), ...(report.content_moments ?? []).map((m) => ({ ...m, src: "ai" as const }))].sort((a, b) => a.timestamp_s - b.timestamp_s);
  if (!all.length) return <p className="text-sm text-muted-foreground">No moments flagged in your latest interview{report.measured_moments ? "" : " (this report predates moment tracking)"}.</p>;
  return <ul className="grid gap-3">{all.map((m, i) => <li key={i} className="rounded-md border-l-2 border-accent bg-secondary/50 px-3 py-2"><div className="flex flex-wrap items-center gap-2"><span className="font-bold tabular-nums text-primary">{fmtTime(m.timestamp_s)}</span><span className="text-sm font-semibold">{m.issue}</span><span className="ml-auto"><Tag kind={m.src} /></span></div>{m.question && <p className="mt-1 text-xs text-muted-foreground">Question: {m.question}</p>}<p className="mt-1 text-sm italic">“{m.excerpt}”</p><p className="mt-1 text-sm">{m.correction}</p></li>)}</ul>;
}

function Presentation({ v, sp }: { v: VisionSummary | null; sp: Record<string, unknown> | null }) {
  const wpm = typeof sp?.words_per_minute === "number" ? sp.words_per_minute : null;
  const fillers = typeof sp?.filler_total === "number" ? sp.filler_total : null;
  const audio = sp?.audio as { clipping_pct?: number | null; pauses?: unknown[] } | undefined;
  const rows: Array<[string, string, Status, string]> = [
    ["Face visibility", v ? `${v.face_visible_pct}%` : "—", pctStatus(v?.face_visible_pct, 85), "Keep your full face inside the camera frame."],
    ["Camera framing", v ? `${v.well_framed_pct}%` : "—", pctStatus(v?.well_framed_pct, 70), "Sit at arm's length with your head near the top third."],
    ["Head orientation", v ? `${v.facing_camera_pct}% facing camera` : "—", pctStatus(v?.facing_camera_pct, 70), "Face the screen and look toward the lens when speaking."],
    ["Posture (shoulders level)", v?.shoulders_level_pct == null ? "—" : `${v.shoulders_level_pct}%`, pctStatus(v?.shoulders_level_pct, 70), "Sit upright with both shoulders visible."],
    ["Speaking speed", wpm ? `${wpm} wpm` : "—", wpm == null ? "Not Enough Data" : wpm >= 110 && wpm <= 170 ? "Good" : "Needs Improvement", "Aim for about 120–160 words per minute."],
    ["Audio clarity (clipping)", audio?.clipping_pct == null ? "—" : `${audio.clipping_pct}%`, audio?.clipping_pct == null ? "Not Enough Data" : audio.clipping_pct <= 2 ? "Good" : "Needs Improvement", "Move slightly away from the microphone if audio distorts."],
    ["Filler words", fillers == null ? "—" : String(fillers), fillers == null ? "Not Enough Data" : fillers <= 5 ? "Good" : "Needs Improvement", "Replace fillers with a short pause."],
    ["Long pauses", audio?.pauses ? String(audio.pauses.length) : "—", audio?.pauses ? audio.pauses.length <= 3 ? "Good" : "Needs Improvement" : "Not Enough Data", "Organise your answer with a quick headline first."],
  ];
  return <div><div className="mb-2"><Tag kind="measured" /></div><div className="divide-y">{rows.map(([l, val, st, tip]) => <div key={l} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-2"><div className="min-w-0"><p className="text-sm font-semibold">{l} <span className="font-normal text-muted-foreground">· {val}</span></p><p className="text-xs text-muted-foreground">{tip}</p></div><span className={`self-center text-xs font-bold ${st === "Good" ? "text-success" : st === "Needs Improvement" ? "text-destructive" : "text-muted-foreground"}`}>{st}</span></div>)}</div><p className="mt-2 text-xs text-muted-foreground">Approximate browser estimates. Blinking and gaze are never treated as nervousness.</p></div>;
}

function Journey({ chrono, cmp }: { chrono: ScoredInterview[]; cmp: ReturnType<typeof compareLatest> }) {
  const data = chrono.map((i, n) => ({ name: `#${n + 1}`, Overall: i.overall_score, Resume: i.report?.category_scores?.resume ?? null, Practical: i.report?.category_scores?.practical ?? null, "General knowledge": i.report?.category_scores?.general_knowledge ?? null }));
  return <div className="grid gap-4">
    {cmp?.previous ? <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5"><p>Previous <strong className="block text-lg">{cmp.previous.overall_score}/100</strong></p><p>Latest <strong className="block text-lg">{cmp.latest.overall_score}/100</strong></p><p>Change <strong className="block text-lg text-primary">{signed(cmp.delta)} points</strong></p><p>Improved area <strong className="block">{cmp.improved?.label ?? "—"}</strong></p><p>Needs attention <strong className="block">{cmp.attention?.label ?? "—"}</strong></p></div> : <p className="text-sm text-muted-foreground">Complete another interview to compare progress — no baseline yet.</p>}
    {data.length > 1 && <div className="h-56"><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" /><YAxis domain={[0, 100]} width={30} fontSize={12} stroke="var(--muted-foreground)" /><Tooltip /><Legend /><Line dataKey="Overall" stroke="var(--primary)" strokeWidth={2} connectNulls /><Line dataKey="Resume" stroke="var(--sky)" connectNulls /><Line dataKey="Practical" stroke="var(--accent)" connectNulls /><Line dataKey="General knowledge" stroke="var(--muted-foreground)" connectNulls /></LineChart></ResponsiveContainer></div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">#</th><th>Date</th><th>Overall</th><th>Resume</th><th>Practical</th><th>GK</th><th>Communication</th><th>Improvement areas</th><th /></tr></thead><tbody>{chrono.map((i, n) => <tr key={i.id} className="border-b align-top"><td className="py-2">{n + 1}</td><td>{date(i.started_at)}</td><td className="font-bold">{i.overall_score}</td><td>{i.report?.category_scores?.resume ?? "—"}</td><td>{i.report?.category_scores?.practical ?? "—"}</td><td>{i.report?.category_scores?.general_knowledge ?? "—"}</td><td>{i.report?.scores.communication.score ?? "—"}</td><td className="max-w-64 text-xs">{i.report?.improvement_areas.slice(0, 2).join("; ")}</td><td><Link to="/report/$id" params={{ id: i.id }} className="text-xs font-semibold text-primary">Report</Link></td></tr>)}</tbody></table></div>
  </div>;
}
