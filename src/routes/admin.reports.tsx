import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, DateRange, ExportButton, PageHeader, useRange } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/reports")({ staticData: { sitemap: false }, component: ReportsPage });

function ReportsPage() {
  const r = useRange(30);
  const people = async () => new Map(((await supabase.from("profiles").select("id, full_name, email").limit(10000)).data ?? []).map((p) => [p.id, p]));
  const exports: { title: string; sub: string; name: string; rows: () => Promise<Record<string, unknown>[]> }[] = [
    { title: "Users", sub: "Registered in the selected range", name: "users", rows: async () => ((await supabase.from("profiles").select("id, full_name, email, phone, created_at, account_status, target_role").gte("created_at", r.fromIso).lte("created_at", r.toIso).limit(10000)).data ?? []) },
    { title: "Course purchases", sub: "Recorded purchases in range", name: "purchases", rows: async () => { const p = await people(); return ((await supabase.from("course_purchases").select("*").gte("purchased_at", r.fromIso).lte("purchased_at", r.toIso).limit(10000)).data ?? []).map((x) => ({ ...x, email: p.get(x.user_id)?.email })); } },
    { title: "Interviews", sub: "Interviews started in range", name: "interviews", rows: async () => { const p = await people(); return ((await supabase.from("interviews").select("id, user_id, status, category, started_at, ended_at, duration_s, overall_score").gte("started_at", r.fromIso).lte("started_at", r.toIso).limit(10000)).data ?? []).map((x) => ({ ...x, email: p.get(x.user_id)?.email })); } },
    { title: "Bookings", sub: "Bookings created in range", name: "bookings", rows: async () => { const p = await people(); return ((await supabase.from("interview_bookings").select("id, user_id, status, created_at, interview_slots(starts_at)").gte("created_at", r.fromIso).lte("created_at", r.toIso).limit(10000)).data ?? []).map((x) => ({ id: x.id, email: p.get(x.user_id)?.email, status: x.status, booked_at: x.created_at, slot: x.interview_slots?.starts_at })); } },
    { title: "Support tickets", sub: "Created in range", name: "support", rows: async () => { const p = await people(); return ((await supabase.from("support_tickets").select("*").gte("created_at", r.fromIso).lte("created_at", r.toIso).limit(10000)).data ?? []).map((x) => ({ ticket: x.ticket_no, email: p.get(x.user_id)?.email, category: x.category, subject: x.subject, status: x.status, priority: x.priority, created_at: x.created_at, resolved_at: x.resolved_at })); } },
    { title: "Credit ledger", sub: "All credit movements in range", name: "credit-ledger", rows: async () => { const p = await people(); return ((await supabase.from("credit_ledger").select("*").gte("created_at", r.fromIso).lte("created_at", r.toIso).limit(10000)).data ?? []).map((x) => ({ email: p.get(x.user_id)?.email, delta: x.delta, reason: x.reason, created_at: x.created_at, by: x.created_by ? p.get(x.created_by)?.email : "system" })); } },
  ];
  return <>
    <PageHeader title="Reports & Exports" sub="CSV files open in Excel and Google Sheets. Exports follow your permissions."><DateRange {...r} /></PageHeader>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exports.map((e) => <Card key={e.name} title={e.title} sub={e.sub}><ExportButton name={e.name} rows={e.rows} /></Card>)}</div>
  </>;
}
