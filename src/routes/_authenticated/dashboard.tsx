import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { resumeAnalysesQuery } from "./resume-builder";
import { resumeCreditsLeft } from "@/lib/resume-analysis";
import type React from "react";
import { StudentPageHeading } from "@/components/student-page-heading";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { benchmarkQuery, bookingQuery, meQuery, myInterviewsQuery, myReportsQuery, myReviewsQuery } from "@/lib/queries";
import { DashboardInsights } from "@/components/dashboard-insights";
import { profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";
import { BookedInterviews } from "@/components/booking-panel";
import { InterviewHistory } from "@/components/interview-history";

export const Route = createFileRoute("/_authenticated/dashboard")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Student dashboard — MBA Compass AI Interview" }, { name: "description", content: "Your booked MBA interviews, available credits and performance history." }, { property: "og:title", content: "Student dashboard — MBA Compass" }, { property: "og:description", content: "Manage booked interviews and track your preparation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(myInterviewsQuery), context.queryClient.ensureQueryData(bookingQuery), context.queryClient.ensureQueryData(myReportsQuery), context.queryClient.ensureQueryData(myReviewsQuery)]),
  component: Dashboard,
});

type Stat = { label: string; value: number; suffix?: string; note: string; tone: "primary" | "accent" | "sky" | "success"; meter?: number; dots?: number };

function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: interviews } = useSuspenseQuery(myInterviewsQuery);
  const { data: bookings } = useSuspenseQuery(bookingQuery);
  const scored = interviews.filter((i) => i.overall_score !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + (i.overall_score ?? 0), 0) / scored.length) : 0;
  const upcoming = bookings.bookings.filter((b) => b.status === "booked" && b.interview_slots && Date.parse(b.interview_slots.ends_at) > Date.now()).length;
  const nextBooking = bookings.bookings.filter((b) => b.status === "booked" && b.interview_slots && Date.parse(b.interview_slots.ends_at) > Date.now()).sort((a, b) => Date.parse(a.interview_slots?.starts_at ?? "") - Date.parse(b.interview_slots?.starts_at ?? ""))[0];
  const completion = profileCompletion(me.profile);
  const trend = scored.slice().reverse().map((i, n) => ({ attempt: `#${n + 1}`, score: i.overall_score }));
  const best = scored.length ? Math.max(...scored.map((i) => i.overall_score ?? 0)) : 0;
  const latest = scored[0];
  const completed = interviews.filter((i) => i.status === "completed").length;
  const stats: Stat[] = [
    { label: "Average score", value: avg, suffix: "/100", note: scored.length ? `Across ${scored.length} scored interview${scored.length > 1 ? "s" : ""}` : "Awaiting first interview", tone: "primary", meter: avg },
    { label: "Best score", value: best, suffix: "/100", note: latest ? `Latest: ${latest.overall_score}/100` : "No scores yet", tone: "accent", meter: best },
    { label: "Completed", value: completed, note: `${upcoming} upcoming`, tone: "sky", meter: completed + upcoming ? Math.round((completed / (completed + upcoming)) * 100) : undefined },
    { label: "Credits", value: me.credits, note: "1 credit per interview", tone: "success", dots: me.credits },
  ];
  return <div className="grid min-w-0 grid-cols-1 gap-7">
    <StudentPageHeading eyebrow="Your preparation, in perspective" title={`Welcome back, ${me.profile?.full_name?.split(" ")[0] || "Student"}`} description={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      <Button asChild variant="outline"><Link to="/my-slots">My interviews</Link></Button><Button asChild><Link to="/slots">Book an interview</Link></Button>
    </StudentPageHeading>
    <ReadinessScale score={scored.length ? avg : null} />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map((s, i) => <StatCard key={s.label} stat={s} i={i} />)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="section-card chart-card animate-reveal flex min-w-0 flex-col p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="student-eyebrow">Performance</p><h2 className="mt-1 text-lg font-bold">Score progression</h2></div>
          <div className="flex items-center gap-3">{trend.length > 0 && <div className="hidden gap-2 sm:flex"><span className="data-chip">Latest {latest?.overall_score}</span><span className="data-chip">Best {best}</span></div>}<ScoreRing value={avg} size={60} stroke={7} tone="primary" /></div>
        </div>
        <div className="mt-4 h-60 flex-1">{trend.length ? <ResponsiveContainer><AreaChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: 4 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={{ stroke: "var(--border)" }} /><YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} width={36} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12, boxShadow: "var(--shadow-soft)" }} formatter={(v) => [`${v}/100`, "Score"]} cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} /><Area dataKey="score" type="monotone" stroke="var(--primary)" fill="url(#scoreFill)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "var(--card)", stroke: "var(--primary)" }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-lg border border-dashed bg-secondary/40 p-6 text-center"><div><p className="font-semibold">Your score trend appears here</p><p className="mt-1 text-sm text-muted-foreground">Complete your first mock interview to start tracking progress.</p><Button asChild size="sm" className="mt-3"><Link to="/slots">Book an interview</Link></Button></div></div>}</div>
      </section>
      <div className="grid min-w-0 gap-4">
        <section className="next-session animate-reveal flex flex-col justify-between gap-4 p-5">
          <div className="min-w-0"><p className="student-eyebrow">Up next</p>{nextBooking?.interview_slots ? <><p className="mt-2 text-2xl font-bold leading-tight text-primary">{countdown(nextBooking.interview_slots.starts_at)}</p><p className="mt-1 text-sm text-muted-foreground">{new Date(nextBooking.interview_slots.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></> : <><h2 className="mt-1 text-lg font-bold">No interview booked</h2><p className="mt-1 text-sm text-muted-foreground">Pick a time that suits you.</p></>}</div>
          <Button asChild size="sm" variant={nextBooking ? "default" : "outline"} className="self-start"><Link to={nextBooking ? "/my-slots" : "/slots"}>{nextBooking ? "View booking" : "Choose a slot"}</Link></Button>
        </section>
        <section className="section-card animate-reveal p-5"><div className="flex items-center justify-between gap-3"><p className="student-eyebrow">Profile readiness</p><strong className="text-xl font-bold text-primary"><AnimatedNumber value={completion} suffix="%" /></strong></div><GrowBar value={completion} tone={completion === 100 ? "bg-success" : "bg-primary"} className="mt-3" /><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{completion === 100 ? "Your profile is complete — interviewers see your full background." : `${100 - completion}% of your profile is still empty — a fuller profile gives sharper feedback.`}</p><Link to="/profile" className="career-cta">{completion < 100 ? "Complete my profile" : "Review my profile"}<span className="career-arrow">→</span></Link></section>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><ResumeCreditCard /><Link to="/sop-review" className="career-tile career-sop"><span className="student-eyebrow">02 · Career tools</span><h2 className="mt-2 text-lg font-bold">AI SOP Review</h2><p className="mt-1 text-xs text-muted-foreground">Scored feedback and a rewritten SOP for your target college.</p><span className="career-cta">Review my SOP<span className="career-arrow">→</span></span></Link></div>
    <DashboardInsights />
    <BookedInterviews />
    <InterviewHistory interviews={interviews} />
  </div>;
}

function StatCard({ stat, i }: { stat: Stat; i: number }) {
  const { label, value, suffix = "", note, tone, meter, dots } = stat;
  return <div style={{ "--i": i } as React.CSSProperties} className={`kpi-card kpi-${tone} animate-reveal`}>
    <div className="flex items-center justify-between gap-2"><p className="kpi-label">{label}</p><span className="kpi-dot" /></div>
    <p className="kpi-value"><AnimatedNumber value={value} />{suffix && <span className="kpi-suffix">{suffix}</span>}</p>
    <p className="kpi-note">{note}</p>
    {meter != null && <div className="kpi-meter" aria-hidden><span style={{ transform: `scaleX(${Math.min(100, Math.max(0, meter)) / 100})` }} /></div>}
    {dots != null && <div className="kpi-dots" aria-hidden>{Array.from({ length: 10 }, (_, n) => <i key={n} className={n < Math.min(dots, 10) ? "on" : ""} />)}</div>}
  </div>;
}

const BANDS = [["Not ready", 0], ["Needs improvement", 20], ["Fair", 40], ["Good", 60], ["Ready for the interview", 80]] as const;
const bandOf = (v: number) => [...BANDS].reverse().find(([, min]) => v >= min)![0];
const bandKey = (v: number) => (v < 20 ? "low" : v < 40 ? "mid" : v < 60 ? "fair" : v < 80 ? "good" : "high");

function countdown(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "Your slot is open now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `Starts in ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Starts in ${hrs} hr${hrs > 1 ? "s" : ""}${mins % 60 ? ` ${mins % 60} min` : ""}`;
  const days = Math.round(hrs / 24);
  return `Starts in ${days} day${days > 1 ? "s" : ""}`;
}

function ReadinessScale({ score }: { score: number | null }) {
  const bench = useQuery(benchmarkQuery(null));
  const b = bench.data;
  const peer = b && b.avg_overall != null ? Math.round(Number(b.avg_overall)) : null;
  const diff = score != null && peer != null ? score - peer : null;
  return <section className="section-card readiness animate-reveal p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><p className="student-eyebrow">Interview readiness</p><h2 className="mt-1 text-lg font-bold">{score == null ? "Take your first interview to see where you stand" : <>Your average: <span className="text-primary"><AnimatedNumber value={score} suffix="/100" /></span></>}</h2></div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {score != null && <span className={`band-pill band-${bandKey(score)}`}>{bandOf(score)}</span>}
        {peer != null && diff != null ? <span className={`font-semibold ${diff >= 0 ? "text-success" : "text-destructive"}`}>{Math.abs(diff)} {Math.abs(diff) === 1 ? "point" : "points"} {diff >= 0 ? "above" : "below"} the all-student average ({peer})</span> : peer != null ? <span className="text-muted-foreground">All-student average: {peer}/100</span> : <span className="text-muted-foreground">All-student average appears after another student completes an interview</span>}
      </div>
    </div>
    <div className="relative mb-10 mt-14">
      <div className="readiness-track" />
      {peer != null && <div className="readiness-mark readiness-peer" style={{ left: `${peer}%` }}><span className="readiness-peer-stem" /><p className="readiness-peer-label">Average {peer}</p></div>}
      {score != null && <div className="readiness-mark readiness-you" style={{ left: `${score}%` }}><p className="readiness-you-tag">You {score}</p><span className="readiness-you-stem" /><span className="readiness-you-dot" /></div>}
    </div>
    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground"><span>Not ready</span><span>Needs improvement</span><span>Fair</span><span>Good</span><span>Ready</span></div>
  </section>;
}

function ResumeCreditCard() {
  const { data = [] } = useQuery(resumeAnalysesQuery);
  const left = resumeCreditsLeft(data);
  return <Link to="/resume-builder" className="career-tile career-resume"><span className="student-eyebrow">01 · Career tools</span><h2 className="mt-2 text-lg font-bold">Resume Builder</h2><p className="mt-1 text-xs text-muted-foreground">{left ? "Free ATS analysis and recreated resume" : "Your free review is in progress"}</p><span className="career-cta">{left ? "Analyse my resume" : "View my analysis"}<span className="career-arrow">→</span></span></Link>;
}
