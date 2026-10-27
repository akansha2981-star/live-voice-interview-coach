import { StudentPageHeading } from "@/components/student-page-heading";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { availableSlotsQuery, bookingQuery, meQuery } from "@/lib/queries";
import { BookedInterviews, SlotPicker } from "@/components/booking-panel";
import { CourseStore } from "@/components/course-store";

export const Route = createFileRoute("/_authenticated/slots")({ staticData: { sitemap: false },
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
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(bookingQuery), context.queryClient.ensureQueryData(availableSlotsQuery)]),
  component: Slots,
});

function Slots() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <div className="grid gap-8">
    <StudentPageHeading eyebrow="My interviews" title="Interview slots" description="Choose your next interview time and keep your preparation moving."><div className="border-l-2 border-success pl-4"><p className="text-xs text-muted-foreground">Available credits</p><p className="text-3xl font-bold text-primary">{me.credits}</p></div></StudentPageHeading>

      <SlotPicker />
      <BookedInterviews />
      <h2 className="text-xl font-bold">Buy interview credits</h2>
      <CourseStore email={me.profile?.email} name={me.profile?.full_name} />
    </div>
  );
}
