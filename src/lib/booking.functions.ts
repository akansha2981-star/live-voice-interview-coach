import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { preflightReady } from "./booking";

export const checkConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(() => ({ payload: "x".repeat(256 * 1024) }));

export const confirmPreflight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bookingId: z.string().uuid(), downloadMbps: z.number().finite(), latencyMs: z.number().finite(), faceVisible: z.boolean(), micConfirmed: z.boolean(), consent: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!preflightReady(data)) throw new Error("Complete all equipment checks first.");
    const { data: booking, error } = await context.supabase.from("interview_bookings").select("*, interview_slots(starts_at, ends_at)").eq("id", data.bookingId).eq("user_id", context.userId).eq("status", "booked").maybeSingle();
    if (error) throw new Error(error.message);
    const slot = booking?.interview_slots;
    if (!slot || Date.parse(slot.starts_at) > Date.now() || Date.parse(slot.ends_at) <= Date.now()) throw new Error("Your booked interview is not open now.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.from("interview_bookings").update({ checked_at: new Date().toISOString(), preflight: data }).eq("id", data.bookingId).eq("user_id", context.userId).eq("status", "booked");
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });