import { createFileRoute, redirect } from "@tanstack/react-router";

// The marketing page now lives at the domain root, so mbacompass.online itself shows it.
// /courses only hands visitors across to that one canonical address.
export const Route = createFileRoute("/courses")({ staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
