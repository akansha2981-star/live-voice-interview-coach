import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CoursesPage, catalogQuery, coursePageDescription } from "@/components/courses-page";
import { siteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  // A locked student (workspace still closed before launch) is handed here with this flag.
  validateSearch: z.object({ locked: z.coerce.number().optional() }),
  head: () => ({ meta: [
    { title: "MBA Mock Interviews · Launching 29 November 2026 — MBA Compass" },
    { name: "description", content: coursePageDescription },
    { property: "og:title", content: "AI MBA Mock Interviews — MBA Compass" },
    { property: "og:description", content: coursePageDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: siteUrl("/") },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: siteUrl("/") }], scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "MBA Compass AI Mock Interview Courses", description: coursePageDescription, url: siteUrl("/") }) }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CoursesPage,
});
