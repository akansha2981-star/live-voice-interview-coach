import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, DateRange, ExportButton, PageHeader, SearchBox, Select, Stat, StatusPill, useRange } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { dailyAverage, fmtDateTime } from "@/lib/admin-utils";
import { INTERVIEW_CATEGORIES } from "@/lib/interview-prompt";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/interviews")({ staticData: { sitemap: false }, component: InterviewsPage });

const STATUS_OPTS: [string, string][] = [["", "All statuses"], ["booked", "Booked"], ["upcoming", "Upcoming"], ["in_progress", "In Progress"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["no_show", "No-show"], ["processing", "Processing"], ["failed", "Failed"]];

function InterviewsPage() {
  const staff = useStaff(); const qc = useQueryClient();
  const r = useRange(30); const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [cat, setCat] = useState("");
  const { data: people } = useQuery(peopleQuery);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "interview-records", r.fromIso, r.toIso], queryFn: async () => {
    const { data, error } = await supabase.from("interview_bookings").select("id, user_id, status, created_at, interview_id, interview_slots(starts_at, ends_at), interviews(id, status, category, started_at, ended_at, overall_score)").gte("created_at", r.fromIso).lte("created_at", r.toIso).order("created_at", { ascending: false }).limit(2000);
    if (error) throw error; return data ?? [];
  } });
  const now = Date.now();
  const rows = data.map((b) => {
    const iv = b.interviews; const slot = b.interview_slots;
    const derived = iv ? (iv.status === "completed" ? "completed" : iv.status === "in_progress" ? "in_progress" : ["analyzing", "generating"].includes(iv.status) ? "processing" : iv.status === "failed" || iv.status === "too_short" ? "failed" : iv.status)
      : b.status === "cancelled" ? "cancelled" : b.status === "no_show" ? "no_show" : slot && Date.parse(slot.ends_at) < now ? "no_show" : slot && Date.parse(slot.starts_at) > now ? "upcoming" : "booked";
    const p = people?.get(b.user_id);
    return { id: b.id, booking_status: b.status, user_id: b.user_id, name: p?.full_name ?? "", email: p?.email ?? "", interview_id: iv?.id ?? null, category: iv?.category ?? null, booked_at: b.created_at, slot: slot?.starts_at ?? null, status: derived, completed_at: iv?.status === "completed" ? iv.ended_at : null, score: iv?.overall_score ?? null, report: iv ? (iv.status === "completed" ? "Ready" : ["analyzing", "generating"].includes(iv.status) ? "Processing" : iv.status === "failed" ? "Failed" : "—") : "—" };
  }).filter((x) => (!status || x.status === status || (status === "booked" && x.booking_status === "booked")) && (!cat || x.category === cat) && `${x.name} ${x.email} ${x.interview_id ?? ""} ${x.id} ${x.slot ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const days = Math.max(1, Math.ceil((Date.parse(r.toIso) - Date.parse(r.fromIso)) / 86400000));
  const completed = rows.filter((x) => x.status === "completed").length;
  const upcomingDemand = rows.filter((x) => x.status === "upcoming").length;
  async function mark(id: string, s: "cancelled" | "no_show") {
    const { error } = await supabase.rpc("admin_cancel_booking", { _booking_id: id, _status: s });
    if (error) return toast.error(error.message); toast.success("Booking updated"); qc.invalidateQueries({ queryKey: ["admin"] });
  }
  return <>
    <PageHeader title="Interview Manager" sub="Every booking and interview record"><DateRange {...r} /><ExportButton name="interviews" rows={() => rows.map(({ booking_status, ...x }) => x)} /></PageHeader>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat i={0} label="Booked in range" value={rows.length} note={`${dailyAverage(rows.length, days)} per day`} /><Stat i={1} label="Completed" value={completed} note={`${dailyAverage(completed, days)} per day`} tone="text-success" /><Stat i={2} label="Upcoming demand" value={upcomingDemand} note="Booked for future slots" /><Stat i={3} label="Cancelled / no-show" value={rows.filter((x) => x.status === "cancelled" || x.status === "no_show").length} tone="text-destructive" /></div>
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3"><SearchBox value={q} onChange={setQ} placeholder="Search student, interview ID or date" /><Select label="Status" value={status} onChange={setStatus} options={STATUS_OPTS} /><Select label="Interview type" value={cat} onChange={setCat} options={[["", "All types"], ...Object.entries(INTERVIEW_CATEGORIES)]} /></div>
      <DataTable loading={isLoading} rows={rows} empty="No interview records in this period." cols={[
        { key: "s", label: "Student", render: (x) => <div><p className="font-semibold">{x.name || "—"}</p><p className="text-xs text-muted-foreground">{x.email}</p></div> },
        { key: "interview_id", label: "Interview ID", render: (x) => x.interview_id ? <code className="text-xs">{x.interview_id.slice(0, 8)}</code> : "—" },
        { key: "category", label: "Type", render: (x) => x.category ? INTERVIEW_CATEGORIES[x.category] ?? x.category : "—" },
        { key: "booked_at", label: "Booked", render: (x) => fmtDateTime(x.booked_at) }, { key: "slot", label: "Slot", render: (x) => fmtDateTime(x.slot) },
        { key: "status", label: "Status", render: (x) => <StatusPill s={x.status} /> }, { key: "completed_at", label: "Completed", render: (x) => fmtDateTime(x.completed_at) },
        { key: "score", label: "Score", render: (x) => x.score ?? "—" }, { key: "report", label: "Report", render: (x) => x.interview_id && x.report === "Ready" ? <Link to="/report/$id" params={{ id: x.interview_id }} className="font-semibold text-primary">Open</Link> : x.report },
        { key: "a", label: "", render: (x) => staff.canOperate && x.booking_status === "booked" && !x.interview_id ? <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => mark(x.id, "cancelled")}>Cancel</Button><Button size="sm" variant="ghost" onClick={() => mark(x.id, "no_show")}>No-show</Button></div> : null },
      ]} />
    </Card>
  </>;
}
