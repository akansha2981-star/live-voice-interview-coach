import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, ExportButton, PageHeader, SearchBox, Stat } from "@/components/admin/admin-ui";
import { fmtDateTime } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/prebookings")({ staticData: { sitemap: false }, component: PrebookingsPage });

function PrebookingsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "prebookings"], queryFn: async () => {
    const { data, error } = await supabase.from("prebookings").select("id,name,email,phone,status,phone_verified_at,paid_at,amount,razorpay_payment_id,created_at").order("created_at", { ascending: false }).limit(5000);
    if (error) throw error; return data ?? [];
  } });
  const rows = data.filter((p) => `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));
  const paid = data.filter((p) => p.paid_at);
  return <>
    <PageHeader title="Prebookings" sub="Everyone who started or completed the ₹1 prebook"><ExportButton name="prebookings" rows={() => rows.map((p) => ({ name: p.name, email: p.email, phone: p.phone, status: p.status, phone_verified_at: p.phone_verified_at, paid_at: p.paid_at, payment_id: p.razorpay_payment_id, created_at: p.created_at }))} /></PageHeader>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3"><Stat i={0} label="Paid prebookings" value={paid.length} /><Stat i={1} label="Phone verified" value={data.filter((p) => p.phone_verified_at).length} /><Stat i={2} label="All entries" value={data.length} /></div>
    <Card title="All prebookings"><div className="mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search name, email or phone" /></div>
      <DataTable loading={isLoading} rows={rows} empty="No prebookings yet." cols={[
        { key: "created_at", label: "Date", render: (p) => fmtDateTime(p.created_at) },
        { key: "name", label: "Student", render: (p) => <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.email}</p></div> },
        { key: "phone", label: "Mobile" },
        { key: "v", label: "OTP", render: (p) => p.phone_verified_at ? "Verified" : "Not verified" },
        { key: "paid_at", label: "₹1 payment", render: (p) => p.paid_at ? `Paid · ${fmtDateTime(p.paid_at)}` : "Not paid" },
      ]} />
    </Card>
  </>;
}
