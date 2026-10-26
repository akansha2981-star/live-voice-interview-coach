import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { bookingQuery } from "@/lib/queries";
import { BookedInterviews } from "@/components/booking-panel";
import { slotPhase } from "@/lib/booking";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-slots")({
  head: () => ({ meta: [{ title: "My slots — MBA Compass AI Interview" }, { name: "description", content: "All your booked AI interview slots in one place." }, { property: "og:title", content: "My slots — MBA Compass" }, { property: "og:description", content: "See and manage your booked interview slots." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(bookingQuery),
  component: MySlots,
});

function MySlots() {
  const { data } = useSuspenseQuery(bookingQuery);
  const past = data.bookings.filter((b) => b.status !== "booked" || (b.interview_slots && slotPhase(b.interview_slots.starts_at, b.interview_slots.ends_at, Date.now()) === "expired"));
  const label: Record<string, string> = { booked: "Missed", started: "Completed", completed: "Completed", cancelled: "Cancelled" };
  return <div className="grid gap-6">
    <section className="animate-reveal section-card flex flex-wrap items-end justify-between gap-4 p-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">My interviews</p><h1 className="mt-1 text-3xl font-bold">My slots</h1><p className="mt-1 text-sm text-muted-foreground">Your camera, microphone and connection are checked right before each interview starts.</p></div><Button asChild><Link to="/slots">Book a new slot</Link></Button></section>
    <BookedInterviews />
    <section className="section-card p-5"><h2 className="text-xl font-bold">Past bookings</h2>
      {!past.length ? <p className="py-6 text-center text-sm text-muted-foreground">No past bookings yet.</p> :
        <div className="mt-2 divide-y">{past.map((b) => b.interview_slots && <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{new Date(b.interview_slots.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{label[b.status] ?? b.status}</span></div>)}</div>}
    </section>
  </div>;
}
