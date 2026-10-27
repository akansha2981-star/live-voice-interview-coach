import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildInterviewerInstructions, buildOpening, type InterviewProfile } from "./interview-prompt";
import { interviewDeadline } from "./interview-limits";

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
    .select("id, user_id, status, started_at, limit_duration_seconds, limit_question_count, limit_question_min_seconds, limit_question_max_seconds, limit_deadline, limit_closed_reason")
    .eq("id", interviewID)
    .maybeSingle();
  if (!interview || interview.user_id !== userID) throw new Error("Interview not found.");
  if (interview.status !== "in_progress") throw new Error("This interview has already ended.");
  const deadline = interviewDeadline(interview.started_at, interview.limit_duration_seconds ?? 1200, interview.limit_deadline);
  if (interview.limit_closed_reason || Date.now() >= deadline) throw new Error("Your interview time has ended. Save your interview to view the report.");
  if (Date.now() - new Date(interview.started_at).getTime() > 3 * 60 * 60 * 1000) {
    throw new Error("This interview session has expired.");
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", userID).maybeSingle();
  if (!profile) throw new Error("Please complete your profile first.");
  const p = profile as unknown as InterviewProfile;
  const [{ data: settings }, { data: booking }] = await Promise.all([
    supabaseAdmin.from("interview_settings").select("duration_minutes").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("interview_bookings").select("college_id, college_name, practice_only").eq("interview_id", interviewID).maybeSingle(),
  ]);
  const ctx = { durationMinutes: (interview.limit_duration_seconds ?? (settings?.duration_minutes ?? 20) * 60) / 60, questionCount: interview.limit_question_count ?? 9, questionMinSeconds: interview.limit_question_min_seconds ?? 30, questionMaxSeconds: interview.limit_question_max_seconds ?? 120, collegeName: null as string | null, intelligence: null as string | null, cases: null as string | null };
  if (booking && !booking.practice_only && booking.college_id) {
    ctx.collegeName = booking.college_name;
    const { data: docs } = await supabaseAdmin.from("college_training_docs").select("kind, knowledge").eq("college_id", booking.college_id).in("kind", ["training", "case"]).eq("status", "saved").order("created_at", { ascending: false }).limit(40);
    Object.assign(ctx, digestKnowledge((docs ?? []) as never));
  }
  return { deadline, instructions: buildInterviewerInstructions(p, ctx), opening: buildOpening(p), userId: userID, interviewId: interviewID };
}

type K = { summary: string; difficulty: string; expectations: string[]; patterns: string[]; questions: { question: string; topic: string; difficulty: string }[]; cases: { title: string; scenario: string; key_asks: string }[] };
// Condenses saved college knowledge into a bounded prompt digest; questions are shuffled so each interview draws different variations.
function digestKnowledge(docs: { kind: string; knowledge: K | null }[]) {
  const ks = docs.map((d) => d.knowledge).filter((k): k is K => !!k);
  if (!ks.length) return { intelligence: null, cases: null };
  const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
  const uniq = (a: string[]) => [...new Set(a.map((x) => x.trim()).filter(Boolean))];
  const lines = [
    `Panel profile: ${ks.map((k) => k.summary).join(" ").slice(0, 1500)}`,
    `Typical difficulty: ${uniq(ks.map((k) => k.difficulty)).join(", ")}`,
    `Panel expectations: ${uniq(ks.flatMap((k) => k.expectations)).slice(0, 15).join("; ")}`,
    `Interview patterns: ${uniq(ks.flatMap((k) => k.patterns)).slice(0, 15).join("; ")}`,
    "Sample trained questions (vary them):",
    ...shuffle(ks.flatMap((k) => k.questions)).slice(0, 30).map((q) => `- [${q.topic}, ${q.difficulty}] ${q.question}`),
  ];
  const cases = shuffle(ks.flatMap((k) => k.cases)).slice(0, 4).map((c) => `- ${c.title}: ${c.scenario.slice(0, 700)} Expected analysis: ${c.key_asks.slice(0, 300)}`);
  return { intelligence: lines.join("\n").slice(0, 9000), cases: cases.length ? cases.join("\n") : null };
}
