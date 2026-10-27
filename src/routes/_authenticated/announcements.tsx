import { StudentPageHeading } from "@/components/student-page-heading";
import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementCard, useAnnouncements } from "@/components/announcement-feed";

export const Route = createFileRoute("/_authenticated/announcements")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Important announcements — MBA Compass" }, { name: "description", content: "Official updates from the MBA Compass team." }, { property: "og:title", content: "Important announcements — MBA Compass" }, { property: "og:description", content: "Latest official updates, events and notices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Announcements,
});

function Announcements() {
  const { data, isLoading, error } = useAnnouncements();
  return <div className="mx-auto grid w-full max-w-2xl gap-5">
    <StudentPageHeading eyebrow="Important announcements" title="Updates from MBA Compass" description="The latest news, events and updates from your MBA Compass team." />
    {error && <p className="text-sm text-destructive">Could not load announcements.</p>}
    {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.posts.length ? <p className="section-card p-8 text-center text-sm text-muted-foreground">No announcements yet.</p> : data.posts.map((p, i) => <AnnouncementCard key={p.id} p={p} me={data.me} i={i} />)}
  </div>;
}
