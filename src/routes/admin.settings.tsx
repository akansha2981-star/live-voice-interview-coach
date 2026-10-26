import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, PageHeader, Select } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { ROLE_LABEL, STAFF_ROLES, type StaffRole } from "@/lib/admin-utils";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const staff = useStaff(); const qc = useQueryClient();
  const { data: people } = useQuery(peopleQuery);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<StaffRole>("support_agent");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "roles"], queryFn: async () => { const { data, error } = await supabase.from("user_roles").select("id, user_id, role").in("role", [...STAFF_ROLES]); if (error) throw error; return data ?? []; } });
  async function set(e: string, r: StaffRole, grant: boolean) {
    const { error } = await supabase.rpc("admin_set_role", { _email: e, _role: r, _grant: grant });
    if (error) return toast.error(error.message);
    toast.success(grant ? "Role granted" : "Role removed"); setEmail(""); qc.invalidateQueries({ queryKey: ["admin", "roles"] });
  }
  const rows = data.map((r) => ({ id: r.id, role: r.role as StaffRole, email: people?.get(r.user_id)?.email ?? r.user_id, name: people?.get(r.user_id)?.full_name ?? "" }));
  return <>
    <PageHeader title="Admin Settings" sub="Staff roles and permissions" />
    <Card title="Role permissions">
      <ul className="grid gap-2 text-sm md:grid-cols-2">
        <li><strong>Super Admin</strong> — everything, including roles and account suspension.</li>
        <li><strong>Operations Admin</strong> — users, credits, slots, purchases, resources, documents, support.</li>
        <li><strong>Support Agent</strong> — read access plus replying to and managing support tickets.</li>
        <li><strong>Read-only Analyst</strong> — view dashboards, records and exports only.</li>
      </ul>
    </Card>
    {staff.isSuper && <Card title="Grant a staff role" sub="The person must already have an account"><div className="flex flex-wrap items-end gap-2"><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-72" /><Select label="Role" value={role} onChange={(v) => setRole(v as StaffRole)} options={STAFF_ROLES.map((r) => [r, ROLE_LABEL[r]] as [string, string])} /><Button onClick={() => set(email, role, true)} disabled={!email.includes("@")}>Grant role</Button></div></Card>}
    <Card title="Staff members"><DataTable loading={isLoading} rows={rows} cols={[{ key: "n", label: "Staff", render: (r) => <div><p className="font-semibold">{r.name || "—"}</p><p className="text-xs text-muted-foreground">{r.email}</p></div> }, { key: "role", label: "Role", render: (r) => ROLE_LABEL[r.role] }, { key: "a", label: "", render: (r) => staff.isSuper && <Button size="sm" variant="ghost" onClick={() => set(r.email, r.role, false)}>Remove</Button> }]} /></Card>
    <Card title="Integrations"><ul className="grid gap-1 text-sm"><li>Payments (Razorpay): <strong>not connected</strong> — course purchases are recorded manually for now.</li><li>Email notifications for ticket replies: <strong>not enabled</strong> — students see replies in Help & Support.</li></ul></Card>
  </>;
}
