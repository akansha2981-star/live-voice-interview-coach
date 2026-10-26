import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Student login — MBA Compass AI Interview" },
      { name: "description", content: "Log in or sign up to access your MBA Compass interview dashboard." },
      { property: "og:title", content: "Student login — MBA Compass AI Interview" },
      { property: "og:description", content: "Secure student portal for MBA Compass AI mock interviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  return <AuthScreen redirect={redirect} />;
}
