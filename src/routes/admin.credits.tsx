import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, ExportButton, PageHeader, SearchBox } from "@/components/admin/admin-ui";
import { CreditAdjuster } from "@/components/admin/credit-adjuster";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime } from "@/lib/admin-utils";
import { useStaff } from "@/hooks/use-staff";

export const Route = createFileRoute("/admin/credits")({ component: CreditsPage });

function CreditsPage() {
  const staff = useStaff();
  const { data: people } = useQuery(peopleQuery);
  const [q, setQ] = useState(""); const [sel, setSel] = useState<string | null>(null);
  const matches = q.trim().length >= 2 ? [...(people?.values() ?? [])].filter((p) => `${p.full_name ?? ""} ${p.email ?? ""} ${p.phone ?? ""} ${p.id}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  const { data: history = [], isLoading } = useQuery({ queryKey: ["admin", "credit-audit"], queryFn: async () => {
    const { data, error } = await supabase.from("audit_logs").select("*").eq("action", "credit_adjustment").order("created_at", { ascending: false }).limit(500);
    if (error) throw error; return data ?? [];
  } });
  const rows = history.map((h) => { const d = h.details as { previous_balance: number; change: number; new_balance: number; reason: string }; return { id: h.id, user: people?.get(h.target_user ?? "")?.email ?? h.target_user, user_id: h.target_user, previous: d.previous_balance, change: d.change, next: d.new_balance, reason: d.reason, admin: people?.get(h.actor_id ?? "")?.email ?? h.actor_id, at: h.created_at }; });
  const selected = sel ? people?.get(sel) : null;
  return <>
    <PageHeader title="Interview Credits" sub="Add, deduct or correct credits — every change needs a reason and is audited"><ExportButton name="credit-adjustments" rows={() => rows} /></PageHeader>
    <Card title="Find a user">
      <SearchBox value={q} onChange={setQ} placeholder="Name, email, phone or user ID" />
      {matches.length > 0 && <ul className="mt-2 divide-y rounded-lg border">{matches.map((p) => <li key={p.id}><button className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary ${sel === p.id ? "bg-secondary" : ""}`} onClick={() => setSel(p.id)}><strong>{p.full_name || "—"}</strong> <span className="text-muted-foreground">{p.email}</span></button></li>)}</ul>}
      {selected && <div className="mt-4"><p className="mb-2 text-sm">Selected: <strong>{selected.full_name || selected.email}</strong></p>{staff.canOperate ? <CreditAdjuster userId={selected.id} /> : <p className="text-sm text-muted-foreground">Read-only access.</p>}</div>}
    </Card>
    <Card title="Credit adjustment history">
      <DataTable loading={isLoading} rows={rows} empty="No manual adjustments yet." cols={[
        { key: "at", label: "Date & time", render: (r) => fmtDateTime(r.at) }, { key: "user", label: "User" }, { key: "previous", label: "Previous" },
        { key: "change", label: "Change", render: (r) => <strong className={r.change > 0 ? "text-success" : "text-destructive"}>{r.change > 0 ? "+" : ""}{r.change}</strong> },
        { key: "next", label: "New balance" }, { key: "reason", label: "Reason" }, { key: "admin", label: "Admin" },
      ]} />
    </Card>
  </>;
}
