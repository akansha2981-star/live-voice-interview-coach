import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, DateRange, ExportButton, PageHeader, Stat, useRange } from "@/components/admin/admin-ui";
import { dailyAverage } from "@/lib/admin-utils";
import { AnimatedNumber } from "@/components/motion";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type Metrics = { users: number; new_users: number; purchases: number; booked: number; completed: number; upcoming: number; cancelled: number; no_show: number; users_with_credits: number; pending_tickets: number; downloads: number; days: number; daily: { day: string; booked: number; completed: number }[] };

function AdminDashboard() {
  const r = useRange(30);
  const { data: m, isLoading, error } = useQuery({ queryKey: ["admin", "metrics", r.fromIso, r.toIso], queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_metrics", { _from: r.fromIso, _to: r.toIso });
    if (error) throw error; return data as unknown as Metrics;
  } });
  const n = (v: number | undefined) => v == null ? "—" : <AnimatedNumber value={v} />;
  const peak = m?.daily.reduce((a, d) => d.booked > (a?.booked ?? -1) ? d : a, null as Metrics["daily"][number] | null);
  const weekly = m ? Object.values(m.daily.reduce((acc, d) => { const dt = new Date(d.day); const k = new Date(dt.getTime() - dt.getDay() * 86400000).toISOString().slice(0, 10); acc[k] ??= { week: k, booked: 0, completed: 0 }; acc[k].booked += d.booked; acc[k].completed += d.completed; return acc; }, {} as Record<string, { week: string; booked: number; completed: number }>)) : [];
  const monthly = m ? Object.values(m.daily.reduce((acc, d) => { const k = d.day.slice(0, 7); acc[k] ??= { month: k, booked: 0, completed: 0 }; acc[k].booked += d.booked; acc[k].completed += d.completed; return acc; }, {} as Record<string, { month: string; booked: number; completed: number }>)) : [];
  return <>
    <PageHeader title="Dashboard" sub="Live platform metrics for the selected period"><DateRange {...r} /><ExportButton name="daily-statistics" rows={() => m?.daily ?? []} /></PageHeader>
    {error && <p className="text-sm text-destructive">Could not load metrics.</p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Stat i={0} label="Registered users" value={n(m?.users)} note={m ? `${m.new_users} new in period` : isLoading ? "Loading…" : ""} />
      <Stat i={1} label="Course purchases" value={n(m?.purchases)} note="Recorded purchases in period" />
      <Stat i={2} label="Interviews booked" value={n(m?.booked)} note={m ? `${dailyAverage(m.booked, m.days)} per day on average` : ""} />
      <Stat i={3} label="Interviews completed" value={n(m?.completed)} note={m ? `${dailyAverage(m.completed, m.days)} per day on average` : ""} tone="text-success" />
      <Stat i={4} label="Upcoming interviews" value={n(m?.upcoming)} note="Booked, not yet held" />
      <Stat i={5} label="Cancelled / no-shows" value={m ? `${m.cancelled} / ${m.no_show}` : "—"} note="In period" tone="text-destructive" />
      <Stat i={6} label="Users with credits" value={n(m?.users_with_credits)} note="Remaining balance above zero" />
      <Stat i={7} label="Pending tickets" value={n(m?.pending_tickets)} note="Open, in progress or waiting" />
      <Stat i={8} label="Resource downloads" value={n(m?.downloads)} note="Authenticated downloads in period" />
      <Stat i={9} label="Peak booking day" value={peak && peak.booked ? new Date(peak.day).toLocaleDateString([], { day: "numeric", month: "short" }) : "—"} note={peak?.booked ? `${peak.booked} bookings` : "No bookings in period"} />
    </div>
    <Card title="Daily bookings vs completions" sub="Booked = appointments created; completed = interviews with a finished report">
      <div className="h-72"><ResponsiveContainer><BarChart data={m?.daily ?? []}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="day" fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(d) => d.slice(5)} /><YAxis allowDecimals={false} width={30} fontSize={11} stroke="var(--muted-foreground)" /><Tooltip /><Legend /><Bar dataKey="booked" name="Booked" fill="var(--primary)" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="var(--sky)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Weekly statistics"><MiniTable rows={weekly.map((w) => ({ period: `Week of ${w.week}`, booked: w.booked, completed: w.completed }))} /></Card>
      <Card title="Monthly statistics"><MiniTable rows={monthly.map((w) => ({ period: w.month, booked: w.booked, completed: w.completed }))} /></Card>
    </div>
  </>;
}

function MiniTable({ rows }: { rows: { period: string; booked: number; completed: number }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data in this period.</p>;
  return <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Period</th><th>Booked</th><th>Completed</th></tr></thead><tbody className="divide-y">{rows.map((r) => <tr key={r.period}><td className="py-1.5">{r.period}</td><td className="tabular-nums">{r.booked}</td><td className="tabular-nums">{r.completed}</td></tr>)}</tbody></table>;
}
