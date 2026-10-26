import { describe, expect, it } from "vitest";
import { countFillers, isProfileReady, wordsPerMinute } from "@/lib/interview-prompt";

describe("interview rules", () => {
  it("requires the core profile fields before an interview", () => {
    expect(isProfileReady({ full_name: "A" })).toBe(false);
    expect(
      isProfileReady({
        full_name: "A",
        education: "B.Com",
        employment_status: "Student",
        target_role: "Consultant",
        interview_category: "consulting",
        career_objectives: "Strategy",
      }),
    ).toBe(true);
  });
  it("counts filler words", () => {
    expect(countFillers("Um I think, like, you know it was um good").total).toBe(4);
  });
  it("computes words per minute", () => {
    expect(wordsPerMinute(150, 60000)).toBe(150);
  });
});
