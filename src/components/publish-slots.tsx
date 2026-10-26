import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PublishSlots({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [capacity, setCapacity] = useState(1);
  const [busy, setBusy] = useState(false);
  async function publish() {
    if (!date) return;
    const starts = new Date(date);
    const [h, m] = time.split(":").map(Number);
    starts.setHours(h, m, 0, 0);
    if (starts.getTime() <= Date.now()) return toast.error("Choose a future date and time.");
    setBusy(true);
    const { error } = await supabase.from("interview_slots").insert({ starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + duration * 60000).toISOString(), capacity, created_by: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Interview slot published.");
    await qc.invalidateQueries({ queryKey: ["bookings"] });
  }
  return <section className="border-y bg-card p-5"><h2 className="text-xl font-bold">Publish interview availability</h2><p className="mt-1 text-sm text-muted-foreground">Times use your local timezone.</p><div className="mt-4 flex flex-wrap items-end gap-3">
    <div className="grid gap-1 text-sm"><span>Date</span><Popover><PopoverTrigger asChild><Button variant="outline">{date ? format(date, "PPP") : "Select date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} className="pointer-events-auto" components={{ Chevron: ({ orientation }) => <span className="text-xs">{orientation === "left" ? "Prev" : "Next"}</span> }} /></PopoverContent></Popover></div>
    <label className="grid gap-1 text-sm">Start time<Input aria-label="Slot start time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
    <label className="grid gap-1 text-sm">Minutes<Input aria-label="Slot duration" className="w-24" type="number" min={5} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label>
    <label className="grid gap-1 text-sm">Available places<Input aria-label="Slot capacity" className="w-28" type="number" min={1} max={100} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
    <Button onClick={publish} disabled={!date || busy || duration < 5 || duration > 120 || capacity < 1 || capacity > 100}>{busy ? "Publishing…" : "Publish slot"}</Button>
  </div></section>;
}