import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { meQuery, myInterviewsQuery } from "@/lib/queries";
import { INTERVIEW_CATEGORIES, isProfileReady, profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MBA Compass AI Interview" },
      { name: "description", content: "Your interview slots, performance analytics, scorecards and history." },
      { property: "og:title", content: "Dashboard — MBA Compass AI Interview" },
      { property: "og:description", content: "Your interview dashboard and performance analytics." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(myInterviewsQuery)]),
  component: Dashboard,
});

const statusLabel: Record<string, string> = {
  in_progress: "In progress",
  analyzing: "Analysing",
  generating: "Analysing",
  completed: "Report ready",
  failed: "Report failed",
  too_short: "Too short",
};

const TIPS = [
  "Structure behavioural answers with STAR: Situation, Task, Action, Result — and quantify the result.",
  "For “Why MBA?”, link your past, your skill gap and your post-MBA goal in under 90 seconds.",
  "In guesstimates, state assumptions aloud before calculating. Interviewers score the approach.",
  "Look at the camera lens, not the screen, when you deliver key points.",
  "Pause for two seconds before answering a hard question — it reads as composure.",
];

function band(score: number) {
  if (score >= 80) return { t: "Excellent", c: "text-success" };
  if (score >= 65) return { t: "Good", c: "text-sky" };
  if (score >= 50) return { t: "Developing", c: "text-accent" };
  return { t: "Needs work", c: "text-destructive" };
}

function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: interviews } = useSuspenseQuery(myInterviewsQuery);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress">("all");
  const completion = profileCompletion(me.profile);
  const ready = isProfileReady(me.profile);
  const first = me.profile?.full_name?.split(" ")[0];

  const scored = interviews.filter((i) => i.overall_score !== null) as (typeof interviews[number] & { overall_score: number })[];
  const trend = scored
    .slice()
    .reverse()
    .map((i, idx) => ({ n: `#${idx + 1}`, score: i.overall_score }));
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + i.overall_score, 0) / scored.length) : 0;
  const best = scored.length ? Math.max(...scored.map((i) => i.overall_score)) : 0;
  const latest = scored[0]?.overall_score ?? 0;
  const prev = scored[1]?.overall_score;
  const delta = prev !== undefined ? latest - prev : null;
  const totalMin = Math.round(interviews.reduce((s, i) => s + (i.duration_s ?? 0), 0) / 60);

  const past = interviews.filter((i) => i.status !== "in_progress");
  const upcoming = interviews.filter((i) => i.status === "in_progress");

  const byCat = Object.entries(
    scored.reduce<Record<string, number[]>>((acc, i) => {
      const k = INTERVIEW_CATEGORIES[i.category ?? ""] ?? "Interview";
      (acc[k] ??= []).push(i.overall_score);
      return acc;
    }, {}),
  ).map(([k, v]) => ({ k, v: Math.round(v.reduce((a, b) => a + b, 0) / v.length), n: v.length }));

  const roadmap = [
    { t: "Complete your profile", done: ready },
    { t: "Take your first mock interview", done: past.length > 0 },
    { t: "Score 65 or above", done: best >= 65 },
    { t: "Complete 3 interviews", done: past.length >= 3 },
    { t: "Score 80 or above", done: best >= 80 },
  ];
  const roadmapDone = roadmap.filter((r) => r.done).length;
  const tip = TIPS[new Date().getDate() % TIPS.length];

  const list = interviews.filter((i) => (filter === "all" ? true : filter === "completed" ? i.status !== "in_progress" : i.status === "in_progress"));

  const stats = [
    { label: "Past interviews", value: past.length, note: "Completed sessions", bar: "bg-primary" },
    { label: "Upcoming", value: upcoming.length, note: "Started, not finished", bar: "bg-sky" },
    { label: "Slots available", value: me.credits, note: "1 slot per interview", bar: "bg-accent" },
    { label: "Practice minutes", value: totalMin, note: "Total time speaking", bar: "bg-success" },
  ];

  return (
    <div className="grid gap-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-rise">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky">Student dashboard</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">Hello{first ? `, ${first}` : ""}.</h1>
          <p className="mt-1 text-muted-foreground">Here's where your interview preparation stands today.</p>
        </div>
        <Button asChild size="lg" className="animate-rise bg-accent font-bold text-accent-foreground hover:bg-accent/90">
          <Link to={!ready ? "/profile" : me.credits < 1 ? "/slots" : "/interview/check"}>
            {!ready ? "Complete profile to start" : me.credits < 1 ? "Buy slots to start" : "Start new interview"}
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="group relative animate-rise overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-bold">
              <AnimatedNumber value={s.value} />
            </p>
            <p className="text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Scorecard + trend */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="animate-rise rounded-2xl bg-gradient-ink p-6 text-ink-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Performance scorecard</p>
          {scored.length ? (
            <div className="mt-5 flex items-center gap-6">
              <div className="text-accent">
                <ScoreRing value={avg} size={140} label="Average" />
              </div>
              <div className="grid flex-1 gap-3 text-sm">
                <div className="flex justify-between border-b border-ink-foreground/10 pb-2">
                  <span className="text-ink-muted">Best</span>
                  <span className="font-bold">{best}</span>
                </div>
                <div className="flex justify-between border-b border-ink-foreground/10 pb-2">
                  <span className="text-ink-muted">Latest</span>
                  <span className="font-bold">
                    {latest}
                    {delta !== null && (
                      <span className={`ml-2 text-xs ${delta >= 0 ? "text-success" : "text-destructive"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Rating</span>
                  <span className={`font-bold ${band(avg).c}`}>{band(avg).t}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-2xl font-bold">No scores yet</p>
              <p className="mt-2 text-sm text-ink-muted">Finish your first interview to unlock your scorecard and analytics.</p>
            </div>
          )}
        </div>

        <div className="animate-rise rounded-2xl border bg-card p-6" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Progress over time</h2>
            <span className="text-xs text-muted-foreground">{scored.length} scored interview{scored.length === 1 ? "" : "s"}</span>
          </div>
          {trend.length > 0 ? (
            <div className="mt-4 h-52">
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="n" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} fill="url(#g)" animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 grid h-52 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Your score trend will appear here.
            </div>
          )}
        </div>
      </div>

      {/* Category / roadmap / tip */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="animate-rise rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold">By interview type</h2>
          <div className="mt-4 grid gap-4">
            {byCat.length ? (
              byCat.map((c, i) => (
                <div key={c.k}>
                  <div className="flex justify-between text-sm">
                    <span>{c.k}</span>
                    <span className="font-bold">
                      {c.v} <span className="text-xs font-normal text-muted-foreground">· {c.n}x</span>
                    </span>
                  </div>
                  <GrowBar value={c.v} tone={["bg-accent", "bg-sky", "bg-primary", "bg-success"][i % 4]} className="mt-1.5" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Breakdown appears after your first scored interview.</p>
            )}
          </div>
        </div>

        <div className="animate-rise rounded-2xl border bg-card p-6" style={{ animationDelay: "70ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Preparation roadmap</h2>
            <span className="text-sm font-bold text-sky">
              {roadmapDone}/{roadmap.length}
            </span>
          </div>
          <ol className="mt-4 grid gap-3">
            {roadmap.map((r, i) => (
              <li key={r.t} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                    r.done ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={r.done ? "text-muted-foreground line-through" : "font-semibold"}>{r.t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Profile completion</span>
              <span>{completion}%</span>
            </div>
            <GrowBar value={completion} className="mt-1.5" />
            <Link to="/profile" className="mt-2 inline-block text-xs font-bold text-sky hover:underline">
              {ready ? "Edit profile" : "Finish profile"}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="animate-rise rounded-2xl border-l-4 border-accent bg-secondary p-6" style={{ animationDelay: "140ms" }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Coach's tip of the day</p>
            <p className="mt-2 leading-relaxed">{tip}</p>
          </div>
          <Link
            to="/slots"
            className="group animate-rise rounded-2xl bg-gradient-ink p-6 text-ink-foreground transition-transform hover:-translate-y-0.5"
            style={{ animationDelay: "210ms" }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Buy more slots</p>
            <p className="mt-2 text-lg font-bold">
              {me.credits} slot{me.credits === 1 ? "" : "s"} left
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              View packs <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </p>
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="animate-rise rounded-2xl border border-sky/40 bg-sky/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky">Upcoming / unfinished</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {upcoming.slice(0, 3).map((u) => (
              <Link key={u.id} to="/interview/$id" params={{ id: u.id }} className="rounded-xl border bg-card px-4 py-3 text-sm font-bold hover:shadow-soft">
                {INTERVIEW_CATEGORIES[u.category ?? ""] ?? "Interview"} — resume →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Interview history</h2>
          <div className="flex rounded-lg bg-muted p-1 text-xs font-bold">
            {(
              [
                ["all", "All"],
                ["completed", "Completed"],
                ["in_progress", "Unfinished"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-3 py-1.5 transition-all ${filter === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No interviews here yet. Your reports will appear here.
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {list.map((i, idx) => (
              <Link
                key={i.id}
                to={i.status === "in_progress" ? "/interview/$id" : "/report/$id"}
                params={{ id: i.id }}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="flex animate-rise items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="w-8 text-sm font-bold text-muted-foreground">{String(list.length - idx).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{INTERVIEW_CATEGORIES[i.category ?? ""] ?? "Interview"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.started_at).toLocaleString()} · {i.difficulty}
                    {i.duration_s ? ` · ${Math.round(i.duration_s / 60)} min` : ""}
                  </p>
                </div>
                <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-bold sm:inline">{statusLabel[i.status] ?? i.status}</span>
                {i.overall_score !== null ? (
                  <span className={`w-12 text-right font-display text-2xl font-bold ${band(i.overall_score).c}`}>{i.overall_score}</span>
                ) : (
                  <span className="w-12 text-right text-muted-foreground">—</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
