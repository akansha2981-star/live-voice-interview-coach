import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { bookingQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { slotPhase } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

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
        <div className="flex gap-2"><Button variant="ghost" disabled={busy === b.id} onClick={() => cancel(b.id)}>Cancel booking</Button>{phase === "ready" ? <Button asChild><Link to="/interview/check" search={{ booking: b.id }}>Check equipment</Link></Button> : <Button disabled>{phase === "upcoming" ? "Not open yet" : "Expired"}</Button>}</div>
      </div>;
    })}</div>
  </section>;
}

export function SlotPicker() {
  const { data } = useSuspenseQuery(bookingQuery);
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const future = data.slots.filter((s) => Date.parse(s.starts_at) > Date.now());
  const visible = future.filter((s) => !date || new Date(s.starts_at).toDateString() === date.toDateString());
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
  return <section className="grid gap-6 border-y bg-card p-5 lg:grid-cols-[auto_1fr]">
    <div><h2 className="mb-3 text-xl font-bold">Select a date</h2><Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setSelected(null); }} disabled={(d) => !future.some((s) => new Date(s.starts_at).toDateString() === d.toDateString())} className="pointer-events-auto" components={{ Chevron: ({ orientation }) => <span className="text-xs">{orientation === "left" ? "Prev" : orientation === "right" ? "Next" : "Open"}</span> }} /><Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>All dates</Button></div>
    <div className="min-w-0"><h2 className="text-xl font-bold">Available times</h2><p className="mt-1 text-sm text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · One credit per interview</p>
      {!visible.length && <p className="py-10 text-sm text-muted-foreground">No published slots for this date. The MBA Compass team will add available times.</p>}
      <div role="region" aria-label="Available interview slots" tabIndex={0} className="mt-5 flex max-h-80 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-h-96">{visible.map((s) => <Button key={s.id} variant={selected === s.id ? "default" : "outline"} aria-pressed={selected === s.id} disabled={s.remaining < 1 || data.bookings.some((b) => b.slot_id === s.id && b.status !== "cancelled")} onClick={() => setSelected(s.id)} className="h-auto shrink-0 justify-between gap-3 whitespace-normal px-4 py-3 text-left"><span>{new Date(s.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}<span className="block font-semibold">{new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></span><span className="shrink-0 text-xs">{s.remaining} left</span></Button>)}</div>
      <Button className="mt-5" onClick={book} disabled={!selected || busy}>{busy ? "Booking…" : "Confirm booking"}</Button>
    </div>
  </section>;
}