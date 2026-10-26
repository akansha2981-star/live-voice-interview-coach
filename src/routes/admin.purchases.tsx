import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, DateRange, ExportButton, PageHeader, SearchBox, useRange } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime } from "@/lib/admin-utils";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/purchases")({ component: PurchasesPage });

/*
 * RAZORPAY INTEGRATION PLACEHOLDER (not enabled).
 * When payments are enabled, add a server route at src/routes/api/public/razorpay-webhook.ts that:
 *  1. verifies the X-Razorpay-Signature header with the webhook secret,
 *  2. inserts a course_purchases row with source = 'razorpay', order_id, amount, currency, payment_status,
 *  3. grants the course's interview credits through the credit ledger.
 * Until then, only manually recorded purchases (source = 'manual') appear here — never fabricated payments.
 */
function PurchasesPage() {
  const staff = useStaff(); const qc = useQueryClient();
  const r = useRange(90); const [q, setQ] = useState("");
  const { data: people } = useQuery(peopleQuery);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "purchases", r.fromIso, r.toIso], queryFn: async () => {
    const { data, error } = await supabase.from("course_purchases").select("*").gte("purchased_at", r.fromIso).lte("purchased_at", r.toIso).order("purchased_at", { ascending: false }).limit(2000);
    if (error) throw error; return data ?? [];
  } });
  const rows = data.map((p) => ({ ...p, name: people?.get(p.user_id)?.full_name ?? "", email: people?.get(p.user_id)?.email ?? "" })).filter((p) => `${p.name} ${p.email} ${p.course_name} ${p.order_id ?? ""} ${p.user_id}`.toLowerCase().includes(q.toLowerCase()));
  const [form, setForm] = useState({ email: "", course: "", order: "", credits: 0 });
  async function record() {
    const user = [...(people?.values() ?? [])].find((p) => p.email?.toLowerCase() === form.email.trim().toLowerCase());
    if (!user) return toast.error("No user with that email.");
    if (form.course.trim().length < 2) return toast.error("Enter the course name.");
    const { error } = await supabase.from("course_purchases").insert({ user_id: user.id, course_name: form.course.trim(), order_id: form.order.trim() || null, interview_credits: Math.max(0, form.credits | 0), source: "manual", created_by: staff.id });
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit", { _action: "purchase_recorded", _target: user.id, _details: { course: form.course } });
    toast.success("Purchase recorded"); setForm({ email: "", course: "", order: "", credits: 0 }); qc.invalidateQueries({ queryKey: ["admin", "purchases"] });
  }
  return <>
    <PageHeader title="Course Purchases" sub="Who purchased which course and when"><DateRange {...r} /><ExportButton name="course-purchases" rows={() => rows.map((p) => ({ user_id: p.user_id, name: p.name, email: p.email, course: p.course_name, purchased_at: p.purchased_at, order_id: p.order_id, amount: p.amount, currency: p.currency, payment_status: p.payment_status, source: p.source, interview_credits: p.interview_credits }))} /></PageHeader>
    <div className="rounded-lg border-l-4 border-accent bg-accent/10 p-4 text-sm"><strong>Payment gateway not connected.</strong> Razorpay is not integrated yet, so no online payments are recorded automatically. Amount and payment status only appear when verified data exists.</div>
    {staff.canOperate && <Card title="Record a verified purchase" sub="For purchases confirmed outside the platform"><div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_100px_auto]"><Input placeholder="Student email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Input placeholder="Course name" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /><Input placeholder="Order ID (optional)" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /><Input type="number" min={0} placeholder="Credits" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /><Button onClick={record}>Record</Button></div><p className="mt-2 text-xs text-muted-foreground">Recording a purchase does not add credits automatically — use Interview Credits so the change is audited.</p></Card>}
    <Card><div className="mb-4"><SearchBox value={q} onChange={setQ} placeholder="Search student, course or order ID" /></div>
      <DataTable loading={isLoading} rows={rows} empty="No course purchases recorded in this period." cols={[
        { key: "s", label: "Student", render: (p) => <div><p className="font-semibold">{p.name || "—"}</p><p className="text-xs text-muted-foreground">{p.email}</p></div> },
        { key: "course_name", label: "Course" }, { key: "purchased_at", label: "Purchased", render: (p) => fmtDateTime(p.purchased_at) },
        { key: "order_id", label: "Order ID", render: (p) => p.order_id || "—" }, { key: "amount", label: "Amount", render: (p) => p.amount != null ? `${p.amount} ${p.currency ?? ""}` : "—" },
        { key: "payment_status", label: "Payment", render: (p) => p.payment_status || "—" }, { key: "source", label: "Source" }, { key: "interview_credits", label: "Credits" },
      ]} /></Card>
  </>;
}
