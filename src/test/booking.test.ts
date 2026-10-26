import { describe, expect, it } from "vitest";
import { MIC_PHRASE, preflightReady, slotPhase, speechMatches } from "../lib/booking";
describe("booked interview checks", () => {
  const passed = { downloadMbps: 3, latencyMs: 200, faceVisible: true, micConfirmed: true, consent: true };
  it("requires good internet before entry", () => { expect(preflightReady({ ...passed, downloadMbps: 0.5 })).toBe(false); expect(preflightReady(passed)).toBe(true); });
  it("requires a visible face", () => { expect(preflightReady({ ...passed, faceVisible: false })).toBe(false); });
  it("requires spoken microphone verification", () => { expect(preflightReady({ ...passed, micConfirmed: false })).toBe(false); expect(speechMatches(MIC_PHRASE)).toBe(true); expect(speechMatches("hello")).toBe(false); });
  it("only opens during the booked date and time", () => { const s = "2026-10-27T10:00:00Z", e = "2026-10-27T10:30:00Z"; expect(slotPhase(s,e,Date.parse("2026-10-27T09:59:00Z"))).toBe("upcoming"); expect(slotPhase(s,e,Date.parse(s))).toBe("ready"); expect(slotPhase(s,e,Date.parse(e))).toBe("expired"); });
});