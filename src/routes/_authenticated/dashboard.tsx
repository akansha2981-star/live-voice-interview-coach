import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bookingQuery, meQuery, myInterviewsQuery, myReportsQuery, myReviewsQuery } from "@/lib/queries";
import { DashboardInsights } from "@/components/dashboard-insights";
import { INTERVIEW_CATEGORIES, profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";
import { BookedInterviews } from "@/components/booking-panel";
import { InterviewHistory } from "@/components/interview-history";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  const trend = scored.slice().reverse().map((i, n) => ({ attempt: `#${n+1}`, score: i.overall_score }));
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <section className="animate-reveal relative overflow-hidden rounded-2xl border bg-card p-6 shadow-soft md:p-8">
      <span aria-hidden className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-secondary to-transparent" />
      <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full border-[18px] border-primary/5" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-sky text-xl font-bold text-primary-foreground shadow-soft">{(me.profile?.full_name || "S")[0].toUpperCase()}</span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</span>{upcoming > 0 && <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">{upcoming} upcoming</span>}</div>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, <span className="text-primary">{me.profile?.full_name?.split(" ")[0] || "Student"}</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">{scored.length ? `Your average score is ${avg}/100 across ${scored.length} interviews — keep practising.` : "Book your first mock interview to start tracking progress."}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Button asChild><Link to="/slots">Book an interview</Link></Button><Button asChild variant="outline"><Link to="/interview/check">Equipment check</Link></Button></div></div>
        </div>
      </div>
    </section>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ label: "COMPLETED INTERVIEWS", value: interviews.filter((i) => i.status === "completed").length, note: "Reports ready" }, { label: "UPCOMING INTERVIEWS", value: upcoming, note: "Booked appointments" }, { label: "AVAILABLE CREDITS", value: me.credits, note: `${upcoming} reserved for bookings` }, { label: "AVERAGE SCORE", value: avg, note: scored.length ? "Across scored interviews" : "No scored interviews yet" }].map((s, i) => <div key={s.label} style={{ "--i": i } as React.CSSProperties} className="animate-reveal card-lift section-card p-5"><p className="text-xs font-semibold text-muted-foreground">{s.label}</p><p className="mt-2 text-3xl font-bold text-primary"><AnimatedNumber value={s.value} /></p><p className="mt-1 text-xs text-muted-foreground">{s.note}</p></div>)}</div>
    <DashboardInsights />
    <BookedInterviews />
    <section className="animate-reveal section-card grid gap-8 p-5 lg:grid-cols-[1fr_2fr]"><div><h2 className="text-xl font-bold">Performance summary</h2><div className="mt-5 flex items-center gap-6"><div className="text-primary"><ScoreRing value={avg} size={110} label="Average" tone="primary" /></div><div className="grid gap-3 text-sm"><p>Best score <strong className="ml-3">{scored.length ? Math.max(...scored.map((i) => i.overall_score ?? 0)) : "—"}</strong></p><p>Scored interviews <strong className="ml-3">{scored.length}</strong></p></div></div><div className="mt-6 flex justify-between text-xs text-muted-foreground"><span>Profile completion</span><span>{profileCompletion(me.profile)}%</span></div><GrowBar value={profileCompletion(me.profile)} tone="bg-primary" className="mt-2" /><Button asChild variant="ghost" size="sm" className="mt-2"><Link to="/profile">Update profile</Link></Button></div><div><h2 className="text-xl font-bold">Score progression</h2><div className="mt-4 h-52">{trend.length ? <ResponsiveContainer><AreaChart data={trend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={12} /><YAxis domain={[0,100]} stroke="var(--muted-foreground)" fontSize={12} width={30} /><Tooltip /><Area dataKey="score" type="monotone" stroke="var(--primary)" fill="var(--secondary)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No performance data yet.</div>}</div></div></section>
    <InterviewHistory interviews={interviews} />
  </div>;
}
