import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { interviewDetailsReady, preflightReady } from "./booking";

export const checkConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(() => ({ payload: "x".repeat(256 * 1024) }));

export const confirmPreflight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bookingId: z.string().uuid(), downloadMbps: z.number().finite(), latencyMs: z.number().finite(), faceVisible: z.boolean(), cameraWorking: z.boolean(), micWorking: z.boolean(), micConfirmed: z.boolean(), consent: z.boolean(), practiceOnly: z.boolean(), collegeId: z.string().uuid().nullable(), actualInterviewAt: z.string().max(40).nullable(), callLetterPath: z.string().max(300).nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!preflightReady(data)) throw new Error("Complete all equipment checks first.");
    if (!interviewDetailsReady(data)) throw new Error("Choose your college, actual interview date and upload your call letter, or mark this as practice.");
    if (data.callLetterPath && !data.callLetterPath.startsWith(`${context.userId}/`)) throw new Error("Invalid call letter.");
    let collegeName: string | null = null;
    if (!data.practiceOnly) { if (!data.collegeId) throw new Error("Choose a college from the list."); const { data: c } = await context.supabase.from("colleges").select("name").eq("id", data.collegeId).eq("active", true).maybeSingle(); if (!c) throw new Error("Choose a college from the list."); collegeName = c.name; }
    const { data: booking, error } = await context.supabase.from("interview_bookings").select("*, interview_slots(starts_at, ends_at)").eq("id", data.bookingId).eq("user_id", context.userId).eq("status", "booked").maybeSingle();
    if (error) throw new Error(error.message);
    const slot = booking?.interview_slots;
    if (!slot || Date.parse(slot.starts_at) > Date.now() || Date.parse(slot.ends_at) <= Date.now()) throw new Error("Your booked interview is not open now.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.from("interview_bookings").update({ checked_at: new Date().toISOString(), preflight: data, practice_only: data.practiceOnly, college_id: data.practiceOnly ? null : data.collegeId, college_name: collegeName, actual_interview_at: data.practiceOnly || !data.actualInterviewAt ? null : new Date(data.actualInterviewAt).toISOString(), call_letter_path: data.practiceOnly ? null : data.callLetterPath }).eq("id", data.bookingId).eq("user_id", context.userId).eq("status", "booked");
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });