import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LaunchNoticeScreen } from "@/components/course-launch-notice";

const description = "MBA Compass student sign-in opens on 29th November 2026. Prebook your early-bird seat for ₹1 and we will email you when your dashboard is ready.";

export const Route = createFileRoute("/auth")({ staticData: { sitemap: false },
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "MBA Compass — live on 29th November 2026" },
      { name: "description", content: description },
      { property: "og:title", content: "MBA Compass — live on 29th November 2026" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  return <LaunchNoticeScreen redirect={redirect} />;
}
