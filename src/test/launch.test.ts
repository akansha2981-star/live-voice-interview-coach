import { describe, expect, it } from "vitest";
import { LAUNCH_LABEL, daysToLaunch, isLive, prebookProgress } from "@/lib/launch";

describe("Pre-launch gating", () => {
  it("names the launch day the students are shown", () => {
    expect(LAUNCH_LABEL).toBe("29th November 2026");
  });

  it("keeps the workspace closed the evening before launch", () => {
    const nightBefore = new Date("2026-11-28T20:00:00+05:30");
    expect(isLive(nightBefore)).toBe(false);
    expect(daysToLaunch(nightBefore)).toBe(1);
  });

  it("goes live at 9:30 AM IST on launch day", () => {
    const launch = new Date("2026-11-29T09:30:00+05:30");
    expect(isLive(launch)).toBe(true);
    expect(daysToLaunch(launch)).toBe(0);
    expect(isLive(new Date("2026-11-29T09:29:00+05:30"))).toBe(false);
  });

  it("fills the prebook window bar with elapsed time only", () => {
    expect(prebookProgress(new Date("2026-09-30T09:30:00+05:30"))).toBe(0);
    expect(prebookProgress(new Date("2026-10-30T09:30:00+05:30"))).toBeCloseTo(0.5);
    expect(prebookProgress(new Date("2026-11-29T09:30:00+05:30"))).toBe(1);
    expect(prebookProgress(new Date("2026-08-01T09:30:00+05:30"))).toBe(0);
  });
});
