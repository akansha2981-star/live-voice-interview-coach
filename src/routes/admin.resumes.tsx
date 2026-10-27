import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader, Stat } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/resumes")({ component: ResumesAdmin });

type Row = { user_id: string; status: string; ats_score: number | null; created_at: string; report: { issues?: { issue: string }[] } | null };

function ResumesAdmin() {
  const { data: rows = [] } = useQuery({ queryKey: ["admin", "resume-analyses"], queryFn: async () => {
    const out: Row[] = [];
    for (let o = 0; ; o += 1000) { const { data, error } = await supabase.from("resume_analyses").select("user_id, status, ats_score, created_at, report").order("created_at").range(o, o + 999); if (error) throw error; out.push(...(data as unknown as Row[])); if (data.length < 1000) break; }
    return out;
  } });
  const { data: users = 0 } = useQuery({ queryKey: ["admin", "user-count"], queryFn: async () => (await supabase.from("profiles").select("id", { count: "exact", head: true })).count ?? 0 });
  const ok = rows.filter((r) => r.status === "completed");
  const failed = rows.filter((r) => r.status === "failed").length;
  const avg = ok.length ? Math.round(ok.reduce((s, r) => s + (r.ats_score ?? 0), 0) / ok.length) : 0;
  const buckets = ["0-39", "40-59", "60-74", "75-89", "90-100"].map((l) => { const [a, b] = l.split("-").map(Number); return { l, n: ok.filter((r) => (r.ats_score ?? 0) >= a && (r.ats_score ?? 0) <= b).length }; });
  const issueCounts = new Map<string, number>();
  for (const r of ok) for (const i of r.report?.issues ?? []) { const k = i.issue.split(/[.:—-]/)[0].trim().slice(0, 70); issueCounts.set(k, (issueCounts.get(k) ?? 0) + 1); }
  const topIssues = [...issueCounts].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const byMonth = new Map<string, number>(); for (const r of rows) { const m = r.created_at.slice(0, 7); byMonth.set(m, (byMonth.get(m) ?? 0) + 1); }
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return <>
    <PageHeader title="Resume Analyzer" sub="Usage and quality of student resume analyses." />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Stat label="Total users" value={users} i={0} /><Stat label="Resumes tested" value={rows.length} i={1} /><Stat label="Successful" value={ok.length} i={2} /><Stat label="Failed (credit kept)" value={failed} i={3} /><Stat label="Credits used" value={ok.length} note={`Avg ATS ${avg}`} i={4} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="ATS score distribution">{buckets.map((b) => <div key={b.l} className="mb-2 flex items-center gap-3 text-sm"><span className="w-16">{b.l}</span><div className="h-3 flex-1 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{ width: `${(b.n / max) * 100}%` }} /></div><span className="w-8 text-right font-semibold">{b.n}</span></div>)}</Card>
      <Card title="Most common resume issues">{topIssues.length ? <ol className="grid gap-1.5 text-sm">{topIssues.map(([k, n], i) => <li key={k} className="flex justify-between gap-3"><span>{i + 1}. {k}</span><strong>{n}</strong></li>)}</ol> : <p className="text-sm text-muted-foreground">No analyses yet.</p>}</Card>
    </div>
    <Card title="Usage trend">{byMonth.size ? <div className="grid gap-1.5 text-sm">{[...byMonth].map(([m, n]) => <div key={m} className="flex justify-between"><span>{new Date(`${m}-01`).toLocaleDateString([], { month: "long", year: "numeric" })}</span><strong>{n}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">No usage yet.</p>}</Card>
  </>;
}
