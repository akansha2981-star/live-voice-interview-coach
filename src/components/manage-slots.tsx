import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
export function ManageSlots() {
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const qc = useQueryClient();
  const { data: slots = [], error } = useQuery({ queryKey: ["admin", "availability", day], queryFn: async () => {
    let q = supabase.from("interview_slots").select("*, interview_bookings(id,status)").order("starts_at");
    if (day) { const start = new Date(`${day}T00:00:00`), end = new Date(start); end.setDate(end.getDate() + 1); q = q.gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()); }
    else q = q.gte("ends_at", new Date().toISOString());
    const { data, error } = await q.limit(1000); if (error) throw error; return data ?? [];
  } });
  async function save(id: string, updates: { published?: boolean; capacity?: number; starts_at?: string; ends_at?: string }) {
    if (updates.starts_at || updates.ends_at) {
      const { data: bookings, error } = await supabase.from("interview_bookings").select("id").eq("slot_id", id).neq("status", "cancelled").limit(1);
      if (error || bookings?.length) return toast.error("This time has a booking and cannot be rescheduled.");
      if (!updates.starts_at || !updates.ends_at || Date.parse(updates.starts_at) <= Date.now() || Date.parse(updates.ends_at) <= Date.parse(updates.starts_at)) return toast.error("Choose a future start and a later end time.");
    }
    setBusy(id); const { error } = await supabase.from("interview_slots").update(updates).eq("id", id); setBusy(null);
    if (error) return toast.error(error.message); setEditing(null); toast.success("Availability updated"); await Promise.all([qc.invalidateQueries({ queryKey: ["admin", "availability"] }), qc.invalidateQueries({ queryKey: ["bookings"] })]);
  }
  return <section className="border-y bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Manage published times</h2><p className="mt-1 text-xs text-muted-foreground">Booked times are protected from rescheduling. Hide a time to stop new bookings.</p></div><label className="grid gap-1 text-xs">Filter date<Input aria-label="Admin availability date" type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label></div>{editing && <div className="mt-4 flex flex-wrap items-end gap-3 border-y py-3"><label className="grid gap-1 text-xs">New start<Input aria-label="Reschedule start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="grid gap-1 text-xs">New end<Input aria-label="Reschedule end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label><Button disabled={!start || !end || busy === editing} onClick={() => save(editing, { starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() })}>Save time</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>}{error && <p className="mt-3 text-destructive">Could not load slots.</p>}<div className="mt-4 max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-secondary"><tr><th className="p-3">Date & time</th><th className="p-3">Places</th><th className="p-3">Bookings</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{slots.map((s) => { const booked = s.interview_bookings.filter((b) => b.status !== "cancelled").length; return <tr key={s.id} className="border-b"><td className="whitespace-nowrap p-3">{new Date(s.starts_at).toLocaleString()}<p className="text-xs text-muted-foreground">Ends {new Date(s.ends_at).toLocaleTimeString()}</p></td><td className="p-3"><Input aria-label={`Capacity ${s.id}`} type="number" min={Math.max(1, booked)} max={100} defaultValue={s.capacity} className="w-20" onBlur={(e) => { const capacity = Number(e.target.value); if (Number.isInteger(capacity) && capacity >= Math.max(1, booked) && capacity <= 100 && capacity !== s.capacity) void save(s.id, { capacity }); }} /></td><td className="p-3">{booked}</td><td className="p-3">{s.published ? "Published" : "Hidden"}</td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => save(s.id, { published: !s.published })}>{s.published ? "Hide" : "Publish"}</Button><Button size="sm" variant="ghost" disabled={booked > 0} onClick={() => { setEditing(s.id); setStart(""); setEnd(""); }}>Edit time</Button></div></td></tr>; })}</tbody></table>{!slots.length && <p className="py-6 text-center text-sm text-muted-foreground">No slots on this date.</p>}</div></section>;
}