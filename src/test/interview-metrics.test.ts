import { describe, expect, it } from "vitest";
import { transcriptMetrics } from "@/lib/interview-metrics";
describe("observable interview tracking", () => {
  it("tracks candidate words separately from interviewer speech", () => {
    expect(transcriptMetrics([{ role: "assistant", text: "Why an MBA?", start_ms: 0, end_ms: 1000 }, { role: "user", text: "To develop my leadership skills", start_ms: 1000, end_ms: 6000 }])).toEqual({ words: 5, answers: 1, interviewerTurns: 1, averageWords: 5, pace: 60 });
  });
  it("does not invent a speaking pace when timing is unavailable", () => {
    expect(transcriptMetrics([{ role: "user", text: "My answer", start_ms: 0, end_ms: 0 }]).pace).toBeNull();
  });
});