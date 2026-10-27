import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/email-alerts")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runEmailAlerts } = await import("@/lib/notifications.server");
        const sent = await runEmailAlerts();
        return Response.json({ success: true, sent });
      },
    },
  },
});
