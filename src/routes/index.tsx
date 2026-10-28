import { createFileRoute } from "@tanstack/react-router";
import { LaunchNoticeScreen } from "@/components/course-launch-notice";
import { siteUrl } from "@/lib/site";

const description = "MBA Compass AI mock interviews open on 29th November 2026. Prebook your early-bird seat for ₹1 and meet Aria, your AI interviewer.";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "MBA Compass — live on 29th November 2026", },
      { name: "description", content: description },
      { property: "og:title", content: "MBA Compass — live on 29th November 2026" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  component: () => <LaunchNoticeScreen />,
});
