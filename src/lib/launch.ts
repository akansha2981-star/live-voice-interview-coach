// Pre-launch gating: the student workspace opens on 29 November 2026 (IST).
// Browser-safe pure module — no imports, no network, no storage.

export const LAUNCH_LABEL = "29th November 2026";
export const LAUNCH_SHORT_LABEL = "29 Nov 2026";
export const LAUNCH_HEADLINE = `Officially launching on ${LAUNCH_LABEL}`;

/** First moment the workspace is open: 29 November 2026, 9:30 AM IST. */
export const LAUNCH_AT = Date.parse("2026-11-29T09:30:00+05:30");

const DAY_MS = 86_400_000;
const PREBOOK_WINDOW_DAYS = 60;

export function isLive(now: Date = new Date()) {
  return now.getTime() >= LAUNCH_AT;
}

/** Whole days remaining before launch, never negative. */
export function daysToLaunch(now: Date = new Date()) {
  return Math.max(0, Math.ceil((LAUNCH_AT - now.getTime()) / DAY_MS));
}

/** How much of the 60-day prebook window has elapsed, 0..1. Time-based, never a seat count. */
export function prebookProgress(now: Date = new Date()) {
  const remaining = Math.max(0, Math.min(PREBOOK_WINDOW_DAYS, (LAUNCH_AT - now.getTime()) / DAY_MS));
  return 1 - remaining / PREBOOK_WINDOW_DAYS;
}
