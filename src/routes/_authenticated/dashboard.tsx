import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Mic, Ticket, UserRound } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { meQuery, myInterviewsQuery } from "@/lib/queries";
import { INTERVIEW_CATEGORIES, isProfileReady, profileCompletion } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MBA Compass AI Interview" },
      { name: "description", content: "Your interview credits, upcoming practice and reports." },
      { property: "og:title", content: "Dashboard — MBA Compass AI Interview" },
      { property: "og:description", content: "Your interview dashboard." },
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

function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: interviews } = useSuspenseQuery(myInterviewsQuery);
  const completion = profileCompletion(me.profile);
  const ready = isProfileReady(me.profile);
  const first = me.profile?.full_name?.split(" ")[0];
  const trend = interviews
    .filter((i) => i.overall_score !== null)
    .slice()
    .reverse()
    .map((i, idx) => ({ n: `#${idx + 1}`, score: i.overall_score }));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-semibold">Hello{first ? `, ${first}` : ""}.</h1>
        <p className="mt-1 text-muted-foreground">Here's where your interview preparation stands.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-ink p-6 text-ink-foreground md:col-span-2">
          <Mic className="mb-4 size-7 text-accent" />
          <h2 className="text-2xl font-semibold">Live AI mock interview</h2>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            About 15 minutes with Aria. Find a quiet, well-lit spot and use headphones if you can.
          </p>
          <div className="mt-6">
            {!ready ? (
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/profile">Complete your profile first</Link>
              </Button>
            ) : me.credits < 1 ? (
              <p className="text-sm text-accent">You have no interview credits. Contact MBA Compass to get access.</p>
            ) : (
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/interview/check">
                  Start interview <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ticket className="size-4" /> Interview credits
            </div>
            <p className="mt-1 font-display text-4xl font-semibold">{me.credits}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <UserRound className="size-4" /> Profile
              </span>
              <span>{completion}%</span>
            </div>
            <Progress value={completion} className="mt-3" />
            <Link to="/profile" className="mt-3 inline-block text-sm font-semibold hover:underline">
              {ready ? "Edit profile" : "Finish profile"}
            </Link>
          </div>
        </div>
      </div>

      {trend.length > 1 && (
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Your progress</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="n" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xl font-semibold">Interview history</h2>
        {interviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No interviews yet. Your reports will appear here.
          </p>
        ) : (
          <div className="divide-y rounded-2xl border bg-card">
            {interviews.map((i) => (
              <Link
                key={i.id}
                to="/report/$id"
                params={{ id: i.id }}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <div className="flex-1">
                  <p className="font-medium">{INTERVIEW_CATEGORIES[i.category ?? ""] ?? "Interview"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.started_at).toLocaleString()} · {i.difficulty}
                    {i.duration_s ? ` · ${Math.round(i.duration_s / 60)} min` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{statusLabel[i.status] ?? i.status}</Badge>
                {i.overall_score !== null && <span className="font-display text-2xl font-semibold">{i.overall_score}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
