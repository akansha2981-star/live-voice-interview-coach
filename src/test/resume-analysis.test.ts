import { expect, it } from "vitest";
import { ANALYSIS_STAGES, isStalled, resumeCreditsLeft, resumeReportSchema } from "@/lib/resume-analysis";

it("keeps the resume deliverable as analysis, never a recreated resume", () => {
  expect(Object.keys(resumeReportSchema.shape)).not.toContain("improved_resume");
});

it("still returns the feedback a student needs to fix their own resume", () => {
  const shape = Object.keys(resumeReportSchema.shape);
  expect(shape).toEqual(expect.arrayContaining(["categories", "swot", "issues", "line_improvements", "keywords", "recommendations"]));
});

it("never promises to build a new resume while analysing", () => {
  expect(ANALYSIS_STAGES.some((s) => /ats-friendly|building your/i.test(s))).toBe(false);
});

it("releases a review that stopped reporting progress after 15 minutes", () => {
  const now = Date.parse("2026-01-01T00:20:00.000Z");
  expect(isStalled({ status: "processing", analysis_progress: { updatedAt: "2026-01-01T00:00:00.000Z" } }, now)).toBe(true);
  expect(isStalled({ status: "processing", analysis_progress: { updatedAt: "2026-01-01T00:19:00.000Z" } }, now)).toBe(false);
  expect(isStalled({ status: "completed", analysis_progress: { updatedAt: "2026-01-01T00:00:00.000Z" } }, now)).toBe(false);
});

it("lets the student start again when the only review left is a stalled one", () => {
  const stalled = { status: "processing", created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), analysis_progress: { updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() } };
  const live = { status: "processing", created_at: new Date().toISOString(), analysis_progress: { updatedAt: new Date().toISOString() } };
  expect(resumeCreditsLeft([stalled])).toBe(1);
  expect(resumeCreditsLeft([live])).toBe(0);
});
