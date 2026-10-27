import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { bookingQuery, meQuery } from "@/lib/queries";
import { BookedInterviews, SlotPicker } from "@/components/booking-panel";
import { CourseStore } from "@/components/course-store";

export const Route = createFileRoute("/_authenticated/slots")({
  head: () => ({
    meta: [
      { title: "Interview slots — MBA Compass AI Interview" },
      { name: "description", content: "See your available interview slots and request more." },
      { property: "og:title", content: "Interview slots — MBA Compass" },
      { property: "og:description", content: "Buy more AI mock interview slots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(bookingQuery)]),
  component: Slots,
});

function Slots() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Interview slots</h1>
          <p className="mt-1 text-muted-foreground">Each live interview uses one slot.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-3">
                    <span className="text-sm text-muted-foreground">Available</span>
          <span className="font-display text-3xl font-semibold">{me.credits}</span>
        </div>
      </div>
      <SlotPicker />
      <BookedInterviews />
      <h2 className="text-xl font-bold">Buy interview credits</h2>
      <CourseStore email={me.profile?.email} name={me.profile?.full_name} />
    </div>
  );
}
