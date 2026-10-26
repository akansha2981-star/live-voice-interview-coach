import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, ExportButton, PageHeader, Pager, SearchBox, Select, StatusPill } from "@/components/admin/admin-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/hooks/use-staff";
import { profileCompletion } from "@/lib/interview-prompt";
import { fmtDateTime } from "@/lib/admin-utils";
import { balances } from "@/lib/admin-queries";
import { CreditAdjuster } from "@/components/admin/credit-adjuster";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });
const PAGE = 25;

async function fetchUsers(q: string, status: string, from: string, page: number, all = false) {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = /^[0-9a-f-]{36}$/i.test(term) ? query.eq("id", term) : query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  if (status) query = query.eq("account_status", status);
  if (from) query = query.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
  const { data, error } = all ? await query.limit(5000) : await query.range(page * PAGE, page * PAGE + PAGE);
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  const [bal, { data: ints }, { data: books }, { data: buys }] = await Promise.all([
    balances(ids),
    supabase.from("interviews").select("user_id, status").in("user_id", ids),
    supabase.from("interview_bookings").select("user_id, status, interview_slots(starts_at, ends_at)").in("user_id", ids),
    supabase.from("course_purchases").select("user_id, course_name, purchased_at").in("user_id", ids),
  ]);
  return rows.map((p) => {
    const b = (books ?? []).filter((x) => x.user_id === p.id);
    const next = b.filter((x) => x.status === "booked" && x.interview_slots && Date.parse(x.interview_slots.ends_at) > Date.now()).map((x) => x.interview_slots!.starts_at).sort()[0] ?? null;
    return { ...p, credits: bal.get(p.id) ?? 0, booked: b.length, completed: (ints ?? []).filter((i) => i.user_id === p.id && i.status === "completed").length, cancelled: b.filter((x) => x.status === "cancelled" || x.status === "no_show").length, next, courses: (buys ?? []).filter((x) => x.user_id === p.id).map((x) => x.course_name).join("; "), completion: profileCompletion(p) };
  });
}
type UserRow = Awaited<ReturnType<typeof fetchUsers>>[number];

function UsersPage() {
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [from, setFrom] = useState(""); const [page, setPage] = useState(0);
  const [open, setOpen] = useState<UserRow | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin", "users", q, status, from, page], queryFn: () => fetchUsers(q, status, from, page) });
  const rows = data.slice(0, PAGE);
  return <>
    <PageHeader title="Users" sub="All registered students and staff accounts">
      <ExportButton name="users" rows={async () => (await fetchUsers(q, status, from, 0, true)).map((u) => ({ user_id: u.id, name: u.full_name, email: u.email, phone: u.phone, registered: u.created_at, profile_completion: `${u.completion}%`, courses: u.courses, credits_remaining: u.credits, booked: u.booked, completed: u.completed, cancelled_or_no_show: u.cancelled, next_interview: u.next, status: u.account_status }))} />
    </PageHeader>
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Search name, email, phone or user ID" /><Select label="Account status" value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[["", "All"], ["active", "Active"], ["suspended", "Suspended"]]} /><label className="grid gap-1 text-xs text-muted-foreground">Registered since<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="h-9 rounded-md border bg-card px-2 text-sm text-foreground" /></label></div>
      {error && <p className="mb-2 text-sm text-destructive">Could not load users.</p>}
      <DataTable loading={isLoading} rows={rows} onRow={setOpen} cols={[
        { key: "name", label: "User", render: (u) => <div><p className="font-semibold">{u.full_name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></div> },
        { key: "phone", label: "Mobile", render: (u) => u.phone || "—" },
        { key: "created_at", label: "Registered", render: (u) => fmtDateTime(u.created_at) },
        { key: "completion", label: "Profile", render: (u) => `${u.completion}%` },
        { key: "credits", label: "Credits", render: (u) => <span className="font-bold tabular-nums">{u.credits}</span> },
        { key: "int", label: "Booked / done", render: (u) => `${u.booked} / ${u.completed}` },
        { key: "next", label: "Upcoming", render: (u) => u.next ? fmtDateTime(u.next) : "—" },
        { key: "account_status", label: "Status", render: (u) => <StatusPill s={u.account_status} /> },
      ]} />
      <Pager page={page} setPage={setPage} hasMore={data.length > PAGE} />
    </Card>
    <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">{open && <UserDetail u={open} />}</DialogContent></Dialog>
  </>;
}

function UserDetail({ u }: { u: UserRow }) {
  const staff = useStaff(); const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "user", u.id], queryFn: async () => {
    const [{ data: interviews }, { data: ledger }, { data: tickets }, { data: buys }] = await Promise.all([
      supabase.from("interviews").select("id, status, started_at, overall_score, category").eq("user_id", u.id).order("started_at", { ascending: false }),
      supabase.from("credit_ledger").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("id, ticket_no, subject, status, created_at").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabase.from("course_purchases").select("*").eq("user_id", u.id).order("purchased_at", { ascending: false }),
    ]);
    return { interviews: interviews ?? [], ledger: ledger ?? [], tickets: tickets ?? [], buys: buys ?? [] };
  } });
  async function setStatus(s: "active" | "suspended") {
    const { error } = await supabase.rpc("admin_set_account_status", { _user_id: u.id, _status: s });
    if (error) return toast.error(error.message);
    toast.success(s === "suspended" ? "Account suspended" : "Account reactivated"); qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }
  const row = (k: string, v: React.ReactNode) => <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm"><span className="text-muted-foreground">{k}</span><span className="min-w-0 break-words">{v || "—"}</span></div>;
  return <>
    <DialogHeader><DialogTitle>{u.full_name || u.email}</DialogTitle></DialogHeader>
    <div className="grid gap-5">
      <div className="divide-y rounded-lg border p-3">{row("User ID", <code className="text-xs">{u.id}</code>)}{row("Email", u.email)}{row("Mobile", u.phone)}{row("Registered", fmtDateTime(u.created_at))}{row("Profile completion", `${u.completion}%`)}{row("Target role", u.target_role)}{row("Resume", u.resume_path ? "Uploaded (see User Documents)" : "Not uploaded")}{row("Account status", <StatusPill s={u.account_status} />)}</div>
      {staff.isSuper && <div className="flex gap-2">{u.account_status === "active" ? <Button variant="destructive" size="sm" onClick={() => setStatus("suspended")}>Suspend account</Button> : <Button size="sm" onClick={() => setStatus("active")}>Reactivate account</Button>}</div>}
      {staff.canOperate && <CreditAdjuster userId={u.id} />}
      <section><h3 className="mb-2 font-semibold">Course purchases</h3>{data?.buys.length ? <ul className="text-sm">{data.buys.map((b) => <li key={b.id}>{b.course_name} · {fmtDateTime(b.purchased_at)} · {b.interview_credits} credits</li>)}</ul> : <p className="text-sm text-muted-foreground">No recorded purchases.</p>}</section>
      <section><h3 className="mb-2 font-semibold">Interviews and reports</h3>{data?.interviews.length ? <ul className="grid gap-1 text-sm">{data.interviews.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2">{fmtDateTime(i.started_at)} <StatusPill s={i.status} /> {i.overall_score != null && <strong>{i.overall_score}/100</strong>}{i.status === "completed" && <Link to="/report/$id" params={{ id: i.id }} className="text-primary underline-offset-2 hover:underline">Open report</Link>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No interviews yet.</p>}</section>
      <section><h3 className="mb-2 font-semibold">Credit history</h3><ul className="max-h-40 overflow-y-auto text-sm">{data?.ledger.map((l) => <li key={l.id} className="flex justify-between border-b py-1"><span>{l.reason}</span><span className={`font-bold ${l.delta > 0 ? "text-success" : "text-destructive"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</span></li>)}</ul></section>
      <section><h3 className="mb-2 font-semibold">Support tickets</h3>{data?.tickets.length ? <ul className="text-sm">{data.tickets.map((t) => <li key={t.id}>#{t.ticket_no} · {t.subject} · <StatusPill s={t.status} /></li>)}</ul> : <p className="text-sm text-muted-foreground">No tickets.</p>}</section>
    </div>
  </>;
}
