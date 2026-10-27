import { describe, expect, it } from "vitest";
import { buildInterviewerInstructions, buildOpening, countFillers, isProfileReady, wordsPerMinute, type InterviewProfile } from "@/lib/interview-prompt";

const profile: InterviewProfile = {
  full_name: "Khushi Verma", education: "B.Com", graduation_year: null,
  employment_status: "Student", work_experience: null, job_title: null,
  industry: null, target_role: "Consultant", target_company: null,
  interview_category: "general_mba", technical_skills: null, functional_skills: null,
  projects: null, achievements: null, career_objectives: "Strategy",
  interview_language: "English", difficulty: "medium", concerns: null,
  accessibility: null, resume_summary: null, use_resume: false, use_concerns: false,
};

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
  it("requires direct questions instead of spoken section announcements", () => {
    const instructions = buildInterviewerInstructions(profile);
    expect(instructions).toContain("Keep the three-section structure and time budgets internal.");
    expect(instructions).toContain("Never announce a section change");
    expect(instructions).toContain("Start the next question directly.");
    expect(instructions).not.toContain("- Announce each section briefly");
  });
  it("grounds school questions in the selected college without impersonating an unnamed panel", () => {
    const selected = buildInterviewerInstructions(profile, { durationMinutes: 10, collegeName: "IIM Ahmedabad", intelligence: null, cases: null });
    expect(selected).toContain('"Why do you want to pursue an MBA at IIM Ahmedabad specifically?"');
    const practice = buildInterviewerInstructions(profile);
    expect(practice).toContain('"What attracts you to your target business school, and how does it fit your goals?"');
    expect(practice).not.toContain('"Why do you want to pursue an MBA at a top Indian business school specifically?"');
  });
  it("keeps follow-ups grounded and removes repetitive voice filler", () => {
    const instructions = buildInterviewerInstructions(profile);
    expect(instructions).toContain("Make follow-ups specific to what the candidate actually said");
    expect(instructions).toContain('do not begin every turn with "Mm", "Okay", "Thank you" or praise');
    expect(instructions).not.toContain('simple transitions ("Let\'s move on to..."');
  });
  it("retains the greeting and opening background question", () => {
    const opening = buildOpening(profile);
    expect(opening).toContain("Greet Khushi warmly in English");
    expect(opening).toContain("ask them to briefly walk you through their background");
  });
});
