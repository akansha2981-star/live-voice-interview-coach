import { describe, expect, it } from "vitest";
import { MIC_PHRASE, preflightReady, slotPhase, speechMatches } from "../lib/booking";
describe("booked interview checks", () => {
  const passed = { downloadMbps: 3, latencyMs: 200, faceVisible: true, cameraWorking: true, micWorking: true, micConfirmed: true, consent: true };
  it("requires a working camera track separately from face detection", () => { expect(preflightReady({ ...passed, cameraWorking: false })).toBe(false); });
  it("requires a working microphone track separately from phrase confirmation", () => { expect(preflightReady({ ...passed, micWorking: false })).toBe(false); });
  it("requires good internet before entry", () => { expect(preflightReady({ ...passed, downloadMbps: 0.5 })).toBe(false); expect(preflightReady(passed)).toBe(true); });
  it("requires a visible face", () => { expect(preflightReady({ ...passed, faceVisible: false })).toBe(false); });
  it("requires spoken microphone verification", () => { expect(preflightReady({ ...passed, micConfirmed: false })).toBe(false); expect(speechMatches(MIC_PHRASE)).toBe(true); expect(speechMatches("hello")).toBe(false); });
  it("only opens during the booked date and time", () => { const s = "2026-10-27T10:00:00Z", e = "2026-10-27T10:30:00Z"; expect(slotPhase(s,e,Date.parse("2026-10-27T09:59:00Z"))).toBe("upcoming"); expect(slotPhase(s,e,Date.parse(s))).toBe("ready"); expect(slotPhase(s,e,Date.parse(e))).toBe("expired"); });
  it("supports the requested five-minute booking windows", () => {
    const start = "2026-10-27T10:00:00Z", end = "2026-10-27T10:05:00Z";
    expect(slotPhase(start, end, Date.parse("2026-10-27T10:04:59Z"))).toBe("ready");
    expect(slotPhase(start, end, Date.parse(end))).toBe("expired");
    expect(slotPhase(end, "2026-10-27T10:10:00Z", Date.parse(end))).toBe("ready");
  });
});
import { interviewDetailsReady } from "@/lib/booking";
describe("interview details", () => {
  it("practice needs no college, date or letter", () => {
    expect(interviewDetailsReady({ practiceOnly: true, collegeId: null, actualInterviewAt: null, callLetterPath: null })).toBe(true);
  });
  it("real interview needs college, date and call letter", () => {
    expect(interviewDetailsReady({ practiceOnly: false, collegeId: "c", actualInterviewAt: "2026-11-02T10:00", callLetterPath: null })).toBe(false);
    expect(interviewDetailsReady({ practiceOnly: false, collegeId: "c", actualInterviewAt: "2026-11-02T10:00", callLetterPath: "u/x.pdf" })).toBe(true);
  });
});
