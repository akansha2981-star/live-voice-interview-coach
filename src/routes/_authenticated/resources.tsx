import { createFileRoute, redirect } from "@tanstack/react-router";

// Old library URL now lives under My Prep Material.
export const Route = createFileRoute("/_authenticated/resources")({ staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/prep/$section", params: { section: "sops" }, replace: true }); },
});
