import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, ExportButton, PageHeader, Pager, Select } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });
const PAGE = 50;

function AuditPage() {
  const { data: people } = useQuery(peopleQuery);
  const [action, setAction] = useState(""); const [page, setPage] = useState(0);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "audit", action, page], queryFn: async () => {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (action) q = q.eq("action", action);
    const { data, error } = await q.range(page * PAGE, page * PAGE + PAGE); if (error) throw error; return data ?? [];
  } });
  const rows = data.slice(0, PAGE).map((a) => ({ id: a.id, at: a.created_at, action: a.action, actor: people?.get(a.actor_id ?? "")?.email ?? a.actor_id ?? "system", target: a.target_user ? people?.get(a.target_user)?.email ?? a.target_user : "—", details: JSON.stringify(a.details) }));
  return <>
    <PageHeader title="Audit Logs" sub="Credit adjustments, role and account changes, slot changes and document access"><ExportButton name="audit-log" rows={() => rows} /></PageHeader>
    <Card>
      <div className="mb-4"><Select label="Action" value={action} onChange={(v) => { setAction(v); setPage(0); }} options={[["", "All actions"], ["credit_adjustment", "Credit adjustment"], ["account_status", "Account status"], ["role_granted", "Role granted"], ["role_revoked", "Role revoked"], ["document_access", "Document access"], ["slots_blocked_date", "Date blocked"], ["booking_cancelled", "Booking cancelled"], ["booking_no_show", "No-show"], ["ticket_updated", "Ticket updated"], ["resource_created", "Resource created"], ["resource_updated", "Resource updated"], ["purchase_recorded", "Purchase recorded"]]} /></div>
      {error && <p className="text-sm text-destructive">You do not have access to audit logs.</p>}
      <DataTable loading={isLoading} rows={rows} empty="No audit events yet." cols={[{ key: "at", label: "Date & time", render: (r) => fmtDateTime(r.at) }, { key: "action", label: "Action" }, { key: "actor", label: "By" }, { key: "target", label: "User affected" }, { key: "details", label: "Details", render: (r) => <code className="block max-w-md truncate text-xs">{r.details}</code> }]} />
      <Pager page={page} setPage={setPage} hasMore={data.length > PAGE} />
    </Card>
  </>;
}
