import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildInterviewerInstructions, buildOpening, type InterviewProfile } from "./interview-prompt";

// Verifies the signed-in student owns an in-progress interview before a paid voice session opens.
export async function authorizeInterviewSession(token: unknown, interviewID: unknown) {
  if (typeof token !== "string" || !token || typeof interviewID !== "string" || !interviewID) {
    throw new Error("Please sign in again to start the interview.");
  }
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Your session expired. Please sign in again.");
  const userID = userData.user.id;

  const { data: interview } = await supabaseAdmin
    .from("interviews")
    .select("id, user_id, status, started_at")
    .eq("id", interviewID)
    .maybeSingle();
  if (!interview || interview.user_id !== userID) throw new Error("Interview not found.");
  if (interview.status !== "in_progress") throw new Error("This interview has already ended.");
  if (Date.now() - new Date(interview.started_at).getTime() > 3 * 60 * 60 * 1000) {
    throw new Error("This interview session has expired.");
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userID).maybeSingle();
  if (!profile) throw new Error("Please complete your profile first.");
  const p = profile as unknown as InterviewProfile;
  return { instructions: buildInterviewerInstructions(p), opening: buildOpening(p) };
}
