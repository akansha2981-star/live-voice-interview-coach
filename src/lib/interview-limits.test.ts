import { expect, it } from "vitest";
import { interviewDeadline, remainingInterviewMs, validQuestionBudget } from "./interview-limits";
it("ends at the configured duration without a five-minute grace", () => {
  const start = "2026-10-27T06:00:00Z";
  const deadline = interviewDeadline(start, 600, null);
  expect(deadline).toBe(Date.parse("2026-10-27T06:10:00Z"));
  expect(remainingInterviewMs(deadline, deadline)).toBe(0);
});
it("preserves the start-time snapshot over changed settings", () => {
  expect(interviewDeadline("2026-10-27T06:00:00Z", 1200, "2026-10-27T06:10:00Z")).toBe(Date.parse("2026-10-27T06:10:00Z"));
});
it("rejects an answer budget that exceeds duration and closing allowance", () => {
  expect(validQuestionBudget(5, 9, 60, 120)).toBe(false);
  expect(validQuestionBudget(20, 9, 30, 120)).toBe(true);
  expect(validQuestionBudget(20, 9, 120, 30)).toBe(false);
});