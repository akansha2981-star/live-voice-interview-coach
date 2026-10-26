import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { PublishSlots } from "@/components/publish-slots";
import { ManageSlots } from "@/components/manage-slots";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/slots")({ component: SlotsPage });

function SlotsPage() {
  const staff = useStaff();
  return <>
    <PageHeader title="Slot Manager" sub="Create, open, close and reschedule interview availability. Double booking is prevented by the database." />
    <CalendarView />
    {staff.canOperate ? <><PublishSlots userId={staff.id} /><BlockDate /><ManageSlots /></> : <p className="text-sm text-muted-foreground">Read-only access: you can view slots but not change them.</p>}
  </>;
}

function CalendarView() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const { data = [] } = useQuery({ queryKey: ["admin", "slot-calendar", month.toISOString()], queryFn: async () => {
    const out: { starts_at: string; capacity: number; published: boolean; interview_bookings: { status: string }[] }[] = [];
    for (let o = 0; ; o += 1000) {
      const { data, error } = await supabase.from("interview_slots").select("starts_at, capacity, published, interview_bookings(status)").gte("starts_at", month.toISOString()).lt("starts_at", end.toISOString()).order("starts_at").range(o, o + 999);
      if (error) throw error; out.push(...(data ?? [])); if (!data || data.length < 1000) break;
    }
    return out;
  } });
  const byDay = new Map<number, { open: number; cap: number; booked: number }>();
  for (const s of data) { const d = new Date(s.starts_at).getDate(); const e = byDay.get(d) ?? { open: 0, cap: 0, booked: 0 }; if (s.published) { e.open++; e.cap += s.capacity; } e.booked += s.interview_bookings.filter((b) => b.status !== "cancelled").length; byDay.set(d, e); }
  const first = month.getDay(); const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <Card title="Calendar view" sub="Open slots, booked and available capacity per day" actions={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</Button><span className="min-w-28 text-center text-sm font-semibold">{month.toLocaleDateString([], { month: "long", year: "numeric" })}</span><Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</Button></div>}>
    <div className="grid grid-cols-7 gap-1.5 text-xs">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1 text-center font-semibold text-muted-foreground">{d}</div>)}
      {Array.from({ length: first }).map((_, i) => <div key={`b${i}`} />)}
      {Array.from({ length: total }).map((_, i) => { const e = byDay.get(i + 1); return <div key={i} className={`min-h-16 rounded-md border p-1.5 ${e?.open ? "bg-secondary/50" : "bg-card"}`}><p className="font-bold">{i + 1}</p>{e ? <><p className="text-primary">{e.open} open</p><p className="text-muted-foreground">{e.booked}/{e.cap} booked</p></> : <p className="text-muted-foreground">Closed</p>}</div>; })}
    </div>
  </Card>;
}

function BlockDate() {
  const qc = useQueryClient(); const [day, setDay] = useState(""); const [busy, setBusy] = useState(false);
  async function block() {
    if (!day) return toast.error("Choose a date.");
    setBusy(true);
    const s = new Date(`${day}T00:00:00`), e = new Date(s); e.setDate(e.getDate() + 1);
    const { data, error } = await supabase.from("interview_slots").update({ published: false }).gte("starts_at", s.toISOString()).lt("starts_at", e.toISOString()).select("id");
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit", { _action: "slots_blocked_date", _target: null as unknown as string, _details: { date: day, slots: data?.length ?? 0 } });
    toast.success(`Closed ${data?.length ?? 0} slots on ${day}. Existing bookings are kept.`); qc.invalidateQueries({ queryKey: ["admin"] });
  }
  return <Card title="Block a holiday or unavailable date" sub="Closes every slot on that date so no new bookings can be made"><div className="flex flex-wrap gap-2"><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-48" /><Button variant="outline" disabled={busy} onClick={block}>Close all slots on this date</Button></div></Card>;
}
