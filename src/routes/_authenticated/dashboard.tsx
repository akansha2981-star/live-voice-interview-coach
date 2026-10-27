import { useQuery } from "@tanstack/react-query";
import { resumeAnalysesQuery } from "./resume-builder";
import { resumeCreditsLeft } from "@/lib/resume-analysis";
import type React from "react";
import { StudentPageHeading } from "@/components/student-page-heading";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { benchmarkQuery, bookingQuery, meQuery, myInterviewsQuery, myReportsQuery, myReviewsQuery } from "@/lib/queries";
import { DashboardInsights } from "@/components/dashboard-insights";
import { INTERVIEW_CATEGORIES, profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";
import { BookedInterviews } from "@/components/booking-panel";
import { InterviewHistory } from "@/components/interview-history";
import { MIN_COMPARISON_SAMPLE } from "@/lib/dashboard-insights";

export const Route = createFileRoute("/_authenticated/dashboard")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Student dashboard — MBA Compass AI Interview" }, { name: "description", content: "Your booked MBA interviews, available credits and performance history." }, { property: "og:title", content: "Student dashboard — MBA Compass" }, { property: "og:description", content: "Manage booked interviews and track your preparation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(myInterviewsQuery), context.queryClient.ensureQueryData(bookingQuery), context.queryClient.ensureQueryData(myReportsQuery), context.queryClient.ensureQueryData(myReviewsQuery)]),
  component: Dashboard,
});
function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: interviews } = useSuspenseQuery(myInterviewsQuery);
  const { data: bookings } = useSuspenseQuery(bookingQuery);
  const scored = interviews.filter((i) => i.overall_score !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + (i.overall_score ?? 0), 0) / scored.length) : 0;
  const upcoming = bookings.bookings.filter((b) => b.status === "booked" && b.interview_slots && Date.parse(b.interview_slots.ends_at) > Date.now()).length;
  const nextBooking = bookings.bookings.filter((b) => b.status === "booked" && b.interview_slots && Date.parse(b.interview_slots.ends_at) > Date.now()).sort((a,b) => Date.parse(a.interview_slots?.starts_at ?? "") - Date.parse(b.interview_slots?.starts_at ?? ""))[0];
  const completion = profileCompletion(me.profile);
  const trend = scored.slice().reverse().map((i, n) => ({ attempt: `#${n+1}`, score: i.overall_score }));
  const best = scored.length ? Math.max(...scored.map((i) => i.overall_score ?? 0)) : 0;
  const latest = scored[0];
  const completed = interviews.filter((i) => i.status === "completed").length;
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <StudentPageHeading eyebrow="Your preparation, in perspective" title={`Welcome back, ${me.profile?.full_name?.split(" ")[0] || "Student"}`} description={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      <Button asChild variant="outline"><Link to="/my-slots">My interviews</Link></Button><Button asChild><Link to="/slots">Book an interview</Link></Button>
    </StudentPageHeading>
    <ReadinessScale score={scored.length ? avg : null} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Average score", value: avg, suffix: "/100", note: scored.length ? `Across ${scored.length} scored` : "Awaiting first interview", tone:"primary" }, { label: "Best score", value: best, suffix: "/100", note: latest ? `Latest: ${latest.overall_score}/100` : "No scores yet", tone:"accent" }, { label: "Completed", value: completed, suffix: "", note: `${upcoming} upcoming`, tone:"sky" }, { label: "Credits", value: me.credits, suffix: "", note: "1 credit per interview", tone:"success" }].map((s, i) => <div key={s.label} style={{ "--i": i } as React.CSSProperties} className={`dashboard-stat stat-${s.tone} animate-reveal p-4`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-muted-foreground">{s.label}</p><span className="stat-dot size-2 shrink-0 rounded-full" /></div><p className="mt-2 text-3xl font-bold"><AnimatedNumber value={s.value} /><span className="ml-1 text-sm font-normal text-muted-foreground">{s.suffix}</span></p><p className="mt-1 text-xs text-muted-foreground">{s.note}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="section-card animate-reveal flex min-w-0 flex-col p-5 lg:col-span-2">
        <div className="flex items-center justify-between gap-3"><div><p className="student-eyebrow">Performance</p><h2 className="mt-1 text-lg font-bold">Score progression</h2></div><div className="text-primary"><ScoreRing value={avg} size={64} tone="primary" /></div></div>
        <div className="mt-3 h-56 flex-1">{trend.length ? <ResponsiveContainer><AreaChart data={trend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={12} /><YAxis domain={[0,100]} stroke="var(--muted-foreground)" fontSize={12} width={30} /><Tooltip /><Area dataKey="score" type="monotone" stroke="var(--primary)" fill="var(--secondary)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-lg border border-dashed bg-secondary/40 p-6 text-center"><div><p className="font-semibold">Your score trend appears here</p><p className="mt-1 text-sm text-muted-foreground">Complete your first mock interview to start tracking progress.</p><Button asChild size="sm" className="mt-3"><Link to="/slots">Book an interview</Link></Button></div></div>}</div>
      </section>
      <div className="grid min-w-0 gap-4">
        <section className="next-session animate-reveal flex flex-col justify-between border-l-2 border-primary bg-card p-5"><div><p className="student-eyebrow">Up next</p><h2 className="mt-1 text-lg font-bold">{nextBooking ? "Your next interview" : "No interview booked"}</h2><p className="mt-1 text-sm text-muted-foreground">{nextBooking?.interview_slots ? new Date(nextBooking.interview_slots.starts_at).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}) : "Pick a time that suits you."}</p></div><Button asChild size="sm" variant="outline" className="mt-3 self-start"><Link to={nextBooking ? "/my-slots" : "/slots"}>{nextBooking ? "View booking" : "Choose a slot"}</Link></Button></section>
        <section className="section-card animate-reveal p-5"><div className="flex items-center justify-between"><p className="student-eyebrow">Profile readiness</p><strong className="text-primary">{completion}%</strong></div><GrowBar value={completion} tone="bg-success" className="mt-3" /><Link to="/profile" className="mt-3 block text-sm font-semibold text-primary">{completion < 100 ? "Complete my profile →" : "Review my profile →"}</Link></section>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2"><ResumeCreditCard /><Link to="/sop-review" className="career-tile career-sop"><span className="student-eyebrow">Career tools</span><h2 className="mt-2 text-lg font-bold">AI SOP Review</h2><p className="mt-1 text-xs text-muted-foreground">Scored feedback and a rewritten SOP for your target college.</p><span className="mt-3 block text-sm font-semibold text-primary">Review my SOP →</span></Link></div>
    <DashboardInsights />
    <BookedInterviews />
    <InterviewHistory interviews={interviews} />
  </div>;
}

function ResumeCreditCard() {
  const { data = [] } = useQuery(resumeAnalysesQuery);
  const left = resumeCreditsLeft(data);
  return <Link to="/resume-builder" className="career-tile career-resume"><span className="student-eyebrow">01 · Career tools</span><h2 className="mt-2 text-lg font-bold">Resume Builder</h2><p className="mt-1 text-xs text-muted-foreground">{left ? "1 resume credit available" : "Your resume analysis is ready"}</p><span className="mt-4 block text-sm font-semibold text-primary">{left ? "Analyse my resume →" : "View my analysis →"}</span></Link>;
}

const BANDS = [["Not ready", 0], ["Needs improvement", 20], ["Fair", 40], ["Good", 60], ["Ready for the interview", 80]] as const;
const bandOf = (v: number) => [...BANDS].reverse().find(([, min]) => v >= min)![0];
function ReadinessScale({ score }: { score: number | null }) {
  const bench = useQuery(benchmarkQuery(null));
  const b = bench.data;
  const peer = b && b.sample_size >= MIN_COMPARISON_SAMPLE && b.avg_overall != null ? Math.round(Number(b.avg_overall)) : null;
  const diff = score != null && peer != null ? score - peer : null;
  return <section className="section-card animate-reveal p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="student-eyebrow">Interview readiness</p><h2 className="mt-1 text-lg font-bold">{score == null ? "Take your first interview to see where you stand" : <>Your average: {score}/100 · <span className="text-primary">{bandOf(score)}</span></>}</h2></div>
      <p className="text-sm text-muted-foreground">{peer == null ? "All-student average appears once enough interviews are taken" : diff == null ? `All-student average: ${peer}/100` : diff >= 0 ? `${diff} points above the all-student average (${peer})` : `${-diff} points below the all-student average (${peer})`}</p></div>
    <div className="relative mt-10 mb-8">
      <div className="h-3 rounded-full" style={{ background: "linear-gradient(90deg, var(--destructive), var(--warning, var(--accent)) 50%, var(--success))" }} />
      {peer != null && <div className="absolute -top-1 -translate-x-1/2 transition-all duration-700" style={{ left: `${peer}%` }}><div className="mx-auto h-5 w-0.5 bg-muted-foreground" /><p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-muted-foreground">Avg {peer}</p></div>}
      {score != null && <div className="absolute bottom-full -translate-x-1/2 pb-1 transition-all duration-700" style={{ left: `${score}%` }}><p className="whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">You {score}</p><div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-primary" /></div>}
    </div>
    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground"><span>Not ready</span><span>Needs improvement</span><span>Fair</span><span>Good</span><span>Ready</span></div>
  </section>;
}
