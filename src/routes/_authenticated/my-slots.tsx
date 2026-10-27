import { StudentPageHeading } from "@/components/student-page-heading";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InterviewTranscript } from "@/components/interview-transcript";
import type { TranscriptTurn } from "@/lib/interview-metrics";
import { bookingQuery, interviewQuery } from "@/lib/queries";
import { BookedInterviews } from "@/components/booking-panel";
import { bookingPhase } from "@/lib/booking";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-slots")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "My slots — MBA Compass AI Interview" }, { name: "description", content: "All your booked AI interview slots in one place." }, { property: "og:title", content: "My slots — MBA Compass" }, { property: "og:description", content: "See and manage your booked interview slots." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(bookingQuery),
  component: MySlots,
});

function MySlots() {
  const { data } = useSuspenseQuery(bookingQuery);
  const past = data.bookings.filter((b) => b.status !== "booked" || bookingPhase(b, Date.now()) === "expired");
  const [open, setOpen] = useState<string | null>(null);
  const { data: detail, isLoading } = useQuery({ ...interviewQuery(open ?? ""), enabled: open !== null });
  const label: Record<string, string> = { booked: "Missed", no_show: "Missed", started: "Completed", completed: "Completed", cancelled: "Cancelled" };
  return <div className="grid gap-6">
    <StudentPageHeading eyebrow="My interviews" title="My slots" description="Your upcoming appointments and past interview reports, together."><Button asChild><Link to="/slots">Book a new slot</Link></Button></StudentPageHeading>

    <BookedInterviews />
    <section className="section-card p-5"><h2 className="text-xl font-bold">Past bookings</h2>
      {!past.length ? <p className="py-6 text-center text-sm text-muted-foreground">No past bookings yet.</p> :
        <div className="mt-2 divide-y">{past.map((b) => b.interview_slots && <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{b.practice_only ? "Practice interview" : b.college_name ?? "MBA mock interview"}</p><p className="text-xs text-muted-foreground">{new Date(b.interview_slots.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{b.actual_interview_at && ` · Actual interview ${new Date(b.actual_interview_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{label[b.status] ?? b.status}</span>{b.interview_id && <><Button size="sm" variant="outline" onClick={() => setOpen(b.interview_id)}>Transcript</Button><Button size="sm" asChild><Link to="/report/$id" params={{ id: b.interview_id }}>View report</Link></Button></>}</div></div>)}</div>}
      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null); }}><DialogContent className="flex h-[80dvh] max-w-3xl flex-col overflow-hidden p-0 [&>button]:hidden"><div className="flex items-center justify-between border-b px-4 py-3"><DialogTitle>Interview transcript</DialogTitle><div className="flex gap-2">{open && <Button size="sm" variant="outline" asChild><Link to="/report/$id" params={{ id: open }}>Full report</Link></Button>}<Button variant="ghost" size="sm" onClick={() => setOpen(null)}>Close</Button></div></div><div className="min-h-0 flex-1">{isLoading ? <p className="p-4">Loading transcript…</p> : (detail?.transcript as unknown as TranscriptTurn[] | undefined)?.length ? <InterviewTranscript turns={detail!.transcript as unknown as TranscriptTurn[]} live={false} /> : <p className="p-4 text-sm text-muted-foreground">No transcript was recorded for this interview.</p>}</div></DialogContent></Dialog>
    </section>
  </div>;
}
