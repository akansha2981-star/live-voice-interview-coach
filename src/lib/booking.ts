export const MIC_PHRASE = "I am ready for my MBA interview and my microphone is working clearly.";
export type Preflight = { downloadMbps: number; latencyMs: number; faceVisible: boolean; micConfirmed: boolean; consent: boolean };
export function preflightReady(p: Preflight) {
  return p.downloadMbps >= 1 && p.latencyMs < 1500 && p.faceVisible && p.micConfirmed && p.consent;
}
export function slotPhase(starts: string, ends: string, now: number) {
  if (now < Date.parse(starts)) return "upcoming";
  if (now >= Date.parse(ends)) return "expired";
  return "ready";
}
export function speechMatches(text: string) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  return ["ready", "interview", "microphone", "working"].every((word) => words.includes(word));
}