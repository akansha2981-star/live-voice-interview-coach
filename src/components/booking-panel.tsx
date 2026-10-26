import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { bookingQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { slotPhase } from "@/lib/booking";
import { Button } from "@/components/ui/button";

export function BookedInterviews() {
  const { data } = useSuspenseQuery(bookingQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const bookings = data.bookings.filter((b) => b.status === "booked");
  async function cancel(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("cancel_interview_booking", { _booking_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["bookings"] });
  }
  return <section className="border-y border-border bg-card px-5 py-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Booked interviews</h2><Button asChild variant="outline"><Link to="/slots">Book a slot</Link></Button></div>
    {!bookings.length && <p className="py-8 text-center text-sm text-muted-foreground">No booked interviews yet.</p>}
    <div className="divide-y">{bookings.map((b) => {
      const s = b.interview_slots;
      if (!s) return null;
      const phase = slotPhase(s.starts_at, s.ends_at, Date.now());
      return <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div><p className="font-semibold">MBA mock interview</p><p className="text-sm text-muted-foreground">{new Date(s.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-xs font-semibold text-primary">{phase === "ready" ? "Your interview is open" : phase === "upcoming" ? "Scheduled" : "Slot ended"}</p></div>
        <div className="flex gap-2"><Button variant="ghost" disabled={busy === b.id} onClick={() => cancel(b.id)}>Cancel booking</Button>{phase === "ready" ? <Button asChild><Link to="/interview/check" search={{ booking: b.id }}>Start interview</Link></Button> : <Button disabled>{phase === "upcoming" ? "Not open yet" : "Expired"}</Button>}</div>
      </div>;
    })}</div>
  </section>;
}

export function SlotPicker() {
  const { data } = useSuspenseQuery(bookingQuery);
  const qc = useQueryClient();
  const [date, setDate] = useState<string | null>(null);
  const [period, setPeriod] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const future = data.slots.filter((s) => Date.parse(s.starts_at) > Date.now());
  const dates = [...new Set(future.map((s) => new Date(s.starts_at).toDateString()))];
  const periods = [{ id: "all", label: "Any time", from: 0, to: 24 }, { id: "morning", label: "Morning", from: 6, to: 12 }, { id: "afternoon", label: "Afternoon", from: 12, to: 18 }, { id: "evening", label: "Evening", from: 18, to: 24 }, { id: "night", label: "Night", from: 0, to: 6 }];
  const activePeriod = periods.find((p) => p.id === period) ?? periods[0];
  const visible = future.filter((s) => {
    const start = new Date(s.starts_at);
    return (!date || start.toDateString() === date) && start.getHours() >= activePeriod.from && start.getHours() < activePeriod.to;
  });
  const selectedSlot = visible.find((s) => s.id === selected);
  function resetFilters() { setDate(null); setPeriod("all"); setSelected(null); }
  async function book() {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("book_interview_slot", { _slot_id: selected });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Interview booked. Your appointment is on the dashboard.");
    setSelected(null);
    await qc.invalidateQueries({ queryKey: ["bookings"] });
  }
  return <section className="min-w-0 border-y bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Available times</h2><p className="mt-1 text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · One credit per interview</p></div><Button size="sm" variant="ghost" disabled={!date && period === "all"} onClick={resetFilters}>Reset</Button></div>
    <div role="group" aria-label="Filter by date" className="mt-4 flex gap-2 overflow-x-auto pb-2">
      <Button size="sm" variant={date === null ? "default" : "outline"} aria-pressed={date === null} className="shrink-0" onClick={() => { setDate(null); setSelected(null); }}>All dates</Button>
      {dates.map((d) => <Button key={d} size="sm" variant={date === d ? "default" : "outline"} aria-pressed={date === d} className="shrink-0" onClick={() => { setDate(d); setSelected(null); }}>{new Date(d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</Button>)}
    </div>
    <div role="group" aria-label="Filter by time" className="flex gap-2 overflow-x-auto pb-2">{periods.map((p) => <Button key={p.id} size="sm" variant={period === p.id ? "secondary" : "ghost"} aria-pressed={period === p.id} className="shrink-0" onClick={() => { setPeriod(p.id); setSelected(null); }}>{p.label}</Button>)}</div>
    <p className="my-2 text-xs text-muted-foreground" aria-live="polite">{visible.length.toLocaleString()} slots</p>
    <div role="region" aria-label="Available interview slots" tabIndex={0} key={`${date}-${period}`} className="flex h-[clamp(8rem,calc(100dvh-33rem),24rem)] min-h-0 flex-col gap-2 overflow-y-scroll overscroll-contain pr-2 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">No slots match these filters.</p>}
      {visible.map((s) => <Button key={s.id} variant={selected === s.id ? "default" : "outline"} aria-pressed={selected === s.id} disabled={s.remaining < 1 || data.bookings.some((b) => b.slot_id === s.id && b.status !== "cancelled")} onClick={() => setSelected(s.id)} className="h-auto shrink-0 justify-between gap-3 whitespace-normal px-4 py-3 text-left"><span>{new Date(s.starts_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}<span className="block font-semibold">{new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></span><span className="shrink-0 text-xs">{s.remaining} left</span></Button>)}
    </div>
    <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3"><p className="min-w-0 text-xs text-muted-foreground">{selectedSlot ? new Date(selectedSlot.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No slot selected"}</p><Button className="shrink-0" onClick={book} disabled={!selectedSlot || busy}>{busy ? "Booking…" : "Confirm booking"}</Button></div>
  </section>;
}