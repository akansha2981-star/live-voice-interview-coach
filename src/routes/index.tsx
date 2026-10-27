import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "MBA Compass AI Interview — Student Portal" },
      {
        name: "description",
        content: "Secure student portal for live AI mock interviews, slots and performance reports by MBA Compass.",
      },
      { property: "og:title", content: "MBA Compass AI Interview — Student Portal" },
      { property: "og:description", content: "Log in to practise live MBA mock interviews with Aria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthScreen />,
});
