import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, ExportButton, PageHeader, SearchBox, Select, Stat, StatusPill } from "@/components/admin/admin-ui";
import { SupportThread } from "@/components/support-thread";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime, TICKET_CATEGORIES, TICKET_STATUS } from "@/lib/admin-utils";
import { useStaff } from "@/hooks/use-staff";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/support")({ component: SupportAdmin });

function SupportAdmin() {
  const staff = useStaff(); const qc = useQueryClient();
  const { data: people } = useQuery(peopleQuery);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [cat, setCat] = useState(""); const [prio, setPrio] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "tickets"], queryFn: async () => { const { data, error } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(2000); if (error) throw error; return data ?? []; }, refetchInterval: 30000 });
  const { data: staffList = [] } = useQuery({ queryKey: ["admin", "staff-list"], queryFn: async () => { const { data } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "operations_admin", "support_agent"]); return [...new Set((data ?? []).map((r) => r.user_id))]; } });
  const rows = data.map((t) => ({ ...t, name: people?.get(t.user_id)?.full_name ?? "", email: people?.get(t.user_id)?.email ?? "", agent: t.assigned_to ? people?.get(t.assigned_to)?.email ?? "Staff" : "Unassigned", hours: t.resolved_at ? Math.round((Date.parse(t.resolved_at) - Date.parse(t.created_at)) / 36e5 * 10) / 10 : null }))
    .filter((t) => (!status || t.status === status) && (!cat || t.category === cat) && (!prio || t.priority === prio) && `#${t.ticket_no} ${t.ticket_no} ${t.subject} ${t.name} ${t.email}`.toLowerCase().includes(q.toLowerCase()));
  const resolved = rows.filter((t) => t.hours != null);
  const ticket = data.find((t) => t.id === open);
  async function update(u: { status?: string; priority?: string; assigned_to?: string | null }) {
    if (!ticket) return;
    const { error } = await supabase.from("support_tickets").update(u).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit", { _action: "ticket_updated", _target: ticket.user_id, _details: { ticket: ticket.ticket_no, ...u } });
    qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  }
  return <>
    <PageHeader title="Support Tickets" sub="Student support requests and conversations"><ExportButton name="support-tickets" rows={() => rows.map((t) => ({ ticket: t.ticket_no, student: t.name, email: t.email, category: t.category, subject: t.subject, priority: t.priority, status: t.status, agent: t.agent, created: t.created_at, updated: t.updated_at, resolution_hours: t.hours }))} /></PageHeader>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><Stat i={0} label="Open" value={data.filter((t) => t.status === "open").length} /><Stat i={1} label="In progress" value={data.filter((t) => t.status === "in_progress").length} /><Stat i={2} label="Waiting for student" value={data.filter((t) => t.status === "waiting_student").length} /><Stat i={3} label="Avg. resolution" value={resolved.length ? `${Math.round(resolved.reduce((s, t) => s + (t.hours ?? 0), 0) / resolved.length * 10) / 10}h` : "—"} /></div>
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3"><SearchBox value={q} onChange={setQ} placeholder="Ticket ID, user, email or subject" /><Select label="Status" value={status} onChange={setStatus} options={[["", "All"], ...Object.entries(TICKET_STATUS)]} /><Select label="Category" value={cat} onChange={setCat} options={[["", "All"], ...TICKET_CATEGORIES.map((c) => [c, c] as [string, string])]} /><Select label="Priority" value={prio} onChange={setPrio} options={[["", "All"], ["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent"]]} /></div>
      <DataTable loading={isLoading} rows={rows} onRow={(t) => setOpen(t.id)} empty="No tickets match." cols={[
        { key: "ticket_no", label: "Ticket", render: (t) => <strong>#{t.ticket_no}</strong> }, { key: "s", label: "Student", render: (t) => <div><p className="font-semibold">{t.name || "—"}</p><p className="text-xs text-muted-foreground">{t.email}</p></div> },
        { key: "category", label: "Category" }, { key: "subject", label: "Subject" }, { key: "created_at", label: "Created", render: (t) => fmtDateTime(t.created_at) }, { key: "updated_at", label: "Updated", render: (t) => fmtDateTime(t.updated_at) },
        { key: "agent", label: "Agent" }, { key: "priority", label: "Priority", render: (t) => <StatusPill s={t.priority} /> }, { key: "status", label: "Status", render: (t) => <StatusPill s={TICKET_STATUS[t.status]} /> },
      ]} />
    </Card>
    <Dialog open={!!ticket} onOpenChange={(o) => !o && setOpen(null)}><DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">{ticket && <>
      <DialogHeader><DialogTitle>#{ticket.ticket_no} · {ticket.subject}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{people?.get(ticket.user_id)?.full_name} · {people?.get(ticket.user_id)?.email} · {ticket.category} · opened {fmtDateTime(ticket.created_at)}</p>
      {staff.canSupport && <div className="flex flex-wrap gap-3">
        <Select label="Status" value={ticket.status} onChange={(v) => update({ status: v })} options={Object.entries(TICKET_STATUS)} />
        <Select label="Priority" value={ticket.priority} onChange={(v) => update({ priority: v })} options={[["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent"]]} />
        <Select label="Assigned to" value={ticket.assigned_to ?? ""} onChange={(v) => update({ assigned_to: v || null })} options={[["", "Unassigned"], ...staffList.map((id) => [id, people?.get(id)?.email ?? id] as [string, string])]} />
      </div>}
      <SupportThread ticketId={ticket.id} userId={staff.id} staff canReply={staff.canSupport} closed={false} />
      <p className="text-xs text-muted-foreground">Students see replies on their Help & Support page. Email notifications are not enabled yet.</p>
    </>}</DialogContent></Dialog>
  </>;
}
