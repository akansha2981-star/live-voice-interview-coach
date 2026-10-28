import { expect, it } from "vitest";
import { ANALYSIS_STAGES, resumeReportSchema } from "@/lib/resume-analysis";

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
