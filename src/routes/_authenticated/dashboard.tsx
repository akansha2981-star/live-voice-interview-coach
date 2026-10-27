import { useQuery } from "@tanstack/react-query";
import { resumeAnalysesQuery } from "./resume-builder";
import { resumeCreditsLeft } from "@/lib/resume-analysis";
import type React from "react";
import { StudentPageHeading } from "@/components/student-page-heading";
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
  const nextBooking = bookings.bookings.filter((b) => b.status === "booked" && b.interview_slots && Date.parse(b.interview_slots.ends_at) > Date.now()).sort((a,b) => Date.parse(a.interview_slots?.starts_at ?? "") - Date.parse(b.interview_slots?.starts_at ?? ""))[0];
  const completion = profileCompletion(me.profile);
  const trend = scored.slice().reverse().map((i, n) => ({ attempt: `#${n+1}`, score: i.overall_score }));
  return <div className="grid min-w-0 grid-cols-1 gap-6">
    <StudentPageHeading eyebrow="Your preparation, in perspective" title={`Welcome back, ${me.profile?.full_name?.split(" ")[0] || "Student"}`} description={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      <Button asChild variant="outline"><Link to="/my-slots">My interviews</Link></Button><Button asChild><Link to="/slots">Book an interview</Link></Button>
    </StudentPageHeading>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <section className="overview-focus animate-reveal grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] md:p-8">
        <div className="min-w-0"><p className="student-eyebrow">MBA Compass · Interview readiness</p><h2 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">A stronger answer.<br />A more confident you.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{scored.length ? `${scored.length} scored interviews in your journey. Continue with your latest feedback and build on every attempt.` : "Your preparation journey starts with your first mock interview."}</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/slots">Continue practising</Link></Button><Button asChild variant="ghost"><Link to="/profile">My profile</Link></Button></div></div>
        <div className="flex flex-col items-center justify-center gap-3 border-t pt-5 text-primary sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0"><ScoreRing value={avg} size={126} tone="primary" /><p className="text-xs font-semibold text-muted-foreground">Average interview score</p><span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">{scored.length ? "Based on your interviews" : "Awaiting first interview"}</span></div>
      </section>
      <section className="next-session animate-reveal flex flex-col justify-between border-l-2 border-primary bg-card p-6"><div><p className="student-eyebrow">Up next</p><h2 className="mt-3 text-xl font-bold">{nextBooking ? "Your next interview" : "Make time for your ambition"}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{nextBooking?.interview_slots ? new Date(nextBooking.interview_slots.starts_at).toLocaleString([], {dateStyle:"full",timeStyle:"short"}) : "No upcoming interview. Choose a time that works for you."}</p></div><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-xs text-muted-foreground">{upcoming} upcoming · {me.credits} credits</span><Button asChild size="sm" variant="outline"><Link to={nextBooking ? "/my-slots" : "/slots"}>{nextBooking ? "View booking" : "Choose a slot"}</Link></Button></div></section>
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ label: "Completed interviews", value: interviews.filter((i) => i.status === "completed").length, note: "Your preparation journey", tone:"primary" }, { label: "Upcoming interviews", value: upcoming, note: "Next opportunities", tone:"sky" }, { label: "Available credits", value: me.credits, note: `${upcoming} reserved for bookings`, tone:"success" }, { label: "Average score", value: avg, note: scored.length ? "Across scored interviews" : "Awaiting first interview", tone:"accent" }].map((s, i) => <div key={s.label} style={{ "--i": i } as React.CSSProperties} className={`dashboard-stat stat-${s.tone} animate-reveal p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-muted-foreground">{s.label}</p><span className="stat-dot size-2 shrink-0 rounded-full" /></div><p className="mt-3 text-4xl font-bold"><AnimatedNumber value={s.value} /><span className="ml-1 text-base font-normal text-muted-foreground">{i === 3 ? "/100" : ""}</span></p><p className="mt-2 text-xs text-muted-foreground">{s.note}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"><ResumeCreditCard /><Link to="/sop-review" className="career-tile career-sop"><span className="student-eyebrow">02 · Career tools</span><h2 className="mt-2 text-lg font-bold">AI SOP Review</h2><p className="mt-1 text-xs text-muted-foreground">Your story. Your target college.</p><span className="mt-4 block text-sm font-semibold text-primary">Review my SOP →</span></Link><div className="career-tile"><div className="flex items-center justify-between"><span className="student-eyebrow">03 · Your profile</span><strong className="text-primary">{completion}%</strong></div><h2 className="mt-2 text-lg font-bold">Interview-ready profile</h2><GrowBar value={completion} tone="bg-success" className="mt-3" /><Button asChild variant="ghost" size="sm" className="mt-2 px-0"><Link to="/profile">Update my profile →</Link></Button></div></div>
    <DashboardInsights />
    <BookedInterviews />
    <section className="animate-reveal section-card grid gap-8 p-5 lg:grid-cols-[1fr_2fr]"><div><h2 className="text-xl font-bold">Performance summary</h2><div className="mt-5 flex items-center gap-6"><div className="text-primary"><ScoreRing value={avg} size={110} label="Average" tone="primary" /></div><div className="grid gap-3 text-sm"><p>Best score <strong className="ml-3">{scored.length ? Math.max(...scored.map((i) => i.overall_score ?? 0)) : "—"}</strong></p><p>Scored interviews <strong className="ml-3">{scored.length}</strong></p></div></div><div className="mt-6 flex justify-between text-xs text-muted-foreground"><span>Profile completion</span><span>{profileCompletion(me.profile)}%</span></div><GrowBar value={profileCompletion(me.profile)} tone="bg-primary" className="mt-2" /><Button asChild variant="ghost" size="sm" className="mt-2"><Link to="/profile">Update profile</Link></Button></div><div><h2 className="text-xl font-bold">Score progression</h2><div className="mt-4 h-52">{trend.length ? <ResponsiveContainer><AreaChart data={trend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={12} /><YAxis domain={[0,100]} stroke="var(--muted-foreground)" fontSize={12} width={30} /><Tooltip /><Area dataKey="score" type="monotone" stroke="var(--primary)" fill="var(--secondary)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No performance data yet.</div>}</div></div></section>
    <InterviewHistory interviews={interviews} />
  </div>;
}

function ResumeCreditCard() {
  const { data = [] } = useQuery(resumeAnalysesQuery);
  const left = resumeCreditsLeft(data);
  return <Link to="/resume-builder" className="career-tile career-resume"><span className="student-eyebrow">01 · Career tools</span><h2 className="mt-2 text-lg font-bold">Resume Builder</h2><p className="mt-1 text-xs text-muted-foreground">{left ? "1 resume credit available" : "Your resume analysis is ready"}</p><span className="mt-4 block text-sm font-semibold text-primary">{left ? "Analyse my resume →" : "View my analysis →"}</span></Link>;
}
