import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, DateRange, ExportButton, PageHeader, SearchBox, Stat, useRange } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/downloads")({ component: DownloadsPage });

function DownloadsPage() {
  const r = useRange(30); const [q, setQ] = useState("");
  const { data: people } = useQuery(peopleQuery);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "downloads", r.fromIso, r.toIso], queryFn: async () => {
    const { data, error } = await supabase.from("resource_downloads").select("*").gte("downloaded_at", r.fromIso).lte("downloaded_at", r.toIso).order("downloaded_at", { ascending: false }).limit(5000);
    if (error) throw error; return data ?? [];
  } });
  const rows = data.map((d) => ({ ...d, email: people?.get(d.user_id)?.email ?? "", name: people?.get(d.user_id)?.full_name ?? "" })).filter((d) => `${d.resource_title} ${d.email} ${d.name}`.toLowerCase().includes(q.toLowerCase()));
  const per = Object.values(rows.reduce((a, d) => { a[d.resource_id] ??= { id: d.resource_id, title: d.resource_title, count: 0, users: new Set<string>() }; a[d.resource_id].count++; a[d.resource_id].users.add(d.user_id); return a; }, {} as Record<string, { id: string; title: string; count: number; users: Set<string> }>));
  return <>
    <PageHeader title="Resource Downloads" sub="Authenticated download events only"><DateRange {...r} /><ExportButton name="resource-downloads" rows={() => rows.map((d) => ({ resource_id: d.resource_id, resource: d.resource_title, user_id: d.user_id, name: d.name, email: d.email, downloaded_at: d.downloaded_at }))} /></PageHeader>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3"><Stat i={0} label="Downloads" value={rows.length} /><Stat i={1} label="Unique users" value={new Set(rows.map((d) => d.user_id)).size} /><Stat i={2} label="Resources downloaded" value={per.length} /></div>
    <Card title="By resource"><DataTable rows={per} empty="No downloads in this period." cols={[{ key: "title", label: "Resource" }, { key: "count", label: "Downloads" }, { key: "u", label: "Unique users", render: (p) => p.users.size }]} /></Card>
    <Card title="Who downloaded what"><div className="mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search resource or user" /></div>
      <DataTable loading={isLoading} rows={rows} empty="No downloads in this period." cols={[{ key: "downloaded_at", label: "Date & time", render: (d) => fmtDateTime(d.downloaded_at) }, { key: "resource_title", label: "Resource" }, { key: "u", label: "User", render: (d) => <div><p className="font-semibold">{d.name || "—"}</p><p className="text-xs text-muted-foreground">{d.email}</p></div> }]} />
    </Card>
  </>;
}
