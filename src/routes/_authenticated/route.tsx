import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { isLive, signedOutTarget } from "@/lib/launch";

export const Route = createFileRoute("/_authenticated")({ staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  // Local session read keeps page changes instant; every data request is re-validated server-side.
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      // Marketing vs workspace: before launch there is no sign-in, so a workspace visitor is
      // handed to the public holding page. Once live, sign-in remembers where they were headed.
      if (signedOutTarget(isLive()) === "/") throw redirect({ to: "/" });
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user };
  },
  component: AppShell,
});
