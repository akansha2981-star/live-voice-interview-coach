import { describe, expect, it } from "vitest";
import { PERFORMANCE_METRICS, RUBRIC, questionTiming, shouldAlert, summarizeAudio, weightedScore } from "@/lib/performance";
import { liveChecks, summarizeVision, type VisionFrame } from "@/lib/vision";
describe("advanced performance rules", () => {
  it("uses the requested 30/20/20/10/10/10 rubric and excludes webcam scoring", () => {
    expect(RUBRIC).toEqual({ answer_quality: 30, structured_thinking: 20, communication: 20, delivery: 10, etiquette: 10, listening: 10 });
    expect(weightedScore({ answer_quality: 100, structured_thinking: 50, communication: 50, delivery: 50, etiquette: 50, listening: 50, presentation: 0 })).toBe(65);
  });
  it("renormalises missing measurements instead of assigning zero", () => {
    expect(weightedScore({ answer_quality: 80, delivery: null })).toBe(80);
    expect(weightedScore({ delivery: null })).toBeNull();
  });
  it("lists all twenty requested performance observations", () => { expect(PERFORMANCE_METRICS).toHaveLength(20); expect(new Set(PERFORMANCE_METRICS).size).toBe(20); });
  it("links answer duration and response gap to the question timestamp", () => {
    expect(questionTiming([{ role: "assistant", text: "Why MBA?", start_ms: 1000, end_ms: 3000 }, { role: "user", text: "Leadership", start_ms: 5000, end_ms: 15000 }])[0]).toMatchObject({ timestamp_s: 1, duration_s: 10, response_latency_s: 2 });
  });
  it("does not count muted mic samples as low volume or pauses", () => {
    const result = summarizeAudio([{ t: 0, rms: 0.1, peak: 0.5, muted: false }, { t: 200, rms: 0, peak: 0, muted: true }, { t: 6000, rms: 0.1, peak: 0.5, muted: false }], 0);
    expect(result.samples).toBe(2); expect(result.pauses).toEqual([]);
  });
  it("enforces coaching cooldown rather than repeated interruptions", () => { expect(shouldAlert(1000, 30999, 30)).toBe(false); expect(shouldAlert(1000, 31000, 30)).toBe(true); });
  it("marks unavailable shoulder and blink measurements as unknown", () => {
    const f: VisionFrame = { t: 0, faceVisible: true, yaw: 0, pitch: 0, gazeCentered: true, centered: true, tooFar: false, tooClose: false, shouldersLevel: null, brightness: 0.5 };
    expect(liveChecks(f).find((c) => c.key === "posture")?.ok).toBeNull();
    expect(summarizeVision([f], 0).blink_rate_per_min).toBeNull();
  });
});