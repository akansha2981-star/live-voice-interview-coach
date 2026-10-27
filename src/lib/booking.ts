export const MIC_PHRASE = "I am ready for my MBA interview and my microphone is working clearly.";
export type Preflight = { downloadMbps: number; latencyMs: number; faceVisible: boolean; cameraWorking: boolean; micWorking: boolean; micConfirmed: boolean; consent: boolean };
export function preflightReady(p: Preflight) {
  return p.downloadMbps >= 1 && p.latencyMs < 1500 && p.cameraWorking && p.faceVisible && p.micWorking && p.micConfirmed && p.consent;
}
export function slotPhase(starts: string, ends: string, now: number) {
  if (now < Date.parse(starts)) return "upcoming";
  if (now >= Date.parse(ends)) return "expired";
  return "ready";
}
/** A "take it now" booking stays open for its own window even if the 5-minute slot rolls over. */
export function bookingPhase(b: { start_now_until?: string | null; interview_slots: { starts_at: string; ends_at: string } | null }, now: number) {
  if (b.start_now_until && Date.parse(b.start_now_until) > now) return "ready";
  return b.interview_slots ? slotPhase(b.interview_slots.starts_at, b.interview_slots.ends_at, now) : null;
}
export function speechMatches(text: string) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  return ["ready", "interview", "microphone", "working"].every((word) => words.includes(word));
}export type InterviewDetails = { practiceOnly: boolean; collegeId: string | null; actualInterviewAt: string | null; callLetterPath: string | null };
/** Practice runs need nothing extra; a real-college run needs college, actual date/time and call letter. */
export function interviewDetailsReady(d: InterviewDetails) {
  if (d.practiceOnly) return true;
  return Boolean(d.collegeId && d.actualInterviewAt && !Number.isNaN(Date.parse(d.actualInterviewAt)) && d.callLetterPath);
}
