import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bookingQuery, meQuery, myInterviewsQuery } from "@/lib/queries";
import { INTERVIEW_CATEGORIES, profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";
import { BookedInterviews } from "@/components/booking-panel";
import { InterviewHistory } from "@/components/interview-history";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Student dashboard — MBA Compass AI Interview" }, { name: "description", content: "Your booked MBA interviews, available credits and performance history." }, { property: "og:title", content: "Student dashboard — MBA Compass" }, { property: "og:description", content: "Manage booked interviews and track your preparation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(myInterviewsQuery), context.queryClient.ensureQueryData(bookingQuery)]),
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
    <section className="border-b pb-6"><p className="text-sm font-semibold text-primary">MBA Compass · Interview workspace</p><div className="mt-2 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Welcome, {me.profile?.full_name?.split(" ")[0] || "Student"}</h1><p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p></div><Button asChild><Link to="/slots">Book an interview</Link></Button></div></section>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ label: "COMPLETED INTERVIEWS", value: interviews.filter((i) => i.status === "completed").length, note: "Reports ready" }, { label: "UPCOMING INTERVIEWS", value: upcoming, note: "Booked appointments" }, { label: "AVAILABLE CREDITS", value: me.credits, note: `${upcoming} reserved for bookings` }, { label: "AVERAGE SCORE", value: avg, note: scored.length ? "Across scored interviews" : "No scored interviews yet" }].map((s) => <div key={s.label} className="animate-rise rounded-lg border bg-card p-5 shadow-soft"><p className="text-xs font-semibold text-muted-foreground">{s.label}</p><p className="mt-2 text-3xl font-bold text-primary"><AnimatedNumber value={s.value} /></p><p className="mt-1 text-xs text-muted-foreground">{s.note}</p></div>)}</div>
    <BookedInterviews />
    <section className="grid gap-8 border-y bg-card p-5 lg:grid-cols-[1fr_2fr]"><div><h2 className="text-xl font-bold">Performance summary</h2><div className="mt-5 flex items-center gap-6"><div className="text-primary"><ScoreRing value={avg} size={110} label="Average" tone="primary" /></div><div className="grid gap-3 text-sm"><p>Best score <strong className="ml-3">{scored.length ? Math.max(...scored.map((i) => i.overall_score ?? 0)) : "—"}</strong></p><p>Scored interviews <strong className="ml-3">{scored.length}</strong></p></div></div><div className="mt-6 flex justify-between text-xs text-muted-foreground"><span>Profile completion</span><span>{profileCompletion(me.profile)}%</span></div><GrowBar value={profileCompletion(me.profile)} tone="bg-primary" className="mt-2" /><Button asChild variant="ghost" size="sm" className="mt-2"><Link to="/profile">Update profile</Link></Button></div><div><h2 className="text-xl font-bold">Score progression</h2><div className="mt-4 h-52">{trend.length ? <ResponsiveContainer><AreaChart data={trend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" stroke="var(--muted-foreground)" fontSize={12} /><YAxis domain={[0,100]} stroke="var(--muted-foreground)" fontSize={12} width={30} /><Tooltip /><Area dataKey="score" type="monotone" stroke="var(--primary)" fill="var(--secondary)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No performance data yet.</div>}</div></div></section>
    <InterviewHistory interviews={interviews} />
  </div>;
}
