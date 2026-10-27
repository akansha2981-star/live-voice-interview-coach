import { describe, expect, it } from "vitest";
import { answerEvidence, reportCommunication } from "@/lib/report-evidence";
import type { InterviewReport } from "@/lib/interview-report";
import type { TranscriptTurn } from "@/lib/interview-metrics";

describe("report evidence integrity", () => {
  const turns: TranscriptTurn[] = [{ role: "assistant", text: "Why MBA?", start_ms: 1000, end_ms: 3000 }, { role: "user", text: "Um actually I want to lead", start_ms: 5000, end_ms: 15000 }];
  it("keeps filler timestamps at turn level and counts real transcript matches", () => {
    const r = reportCommunication(turns);
    expect(r.total).toBe(2); expect(r.counts).toEqual({ um: 1, actually: 1 });
    expect(r.points[0]).toMatchObject({ timestamp_s: 5, pace: 36 });
  });
  it("does not invent pace for missing caption duration", () => {
    expect(reportCommunication([{ ...turns[1], end_ms: 5000 }]).points[0].pace).toBeNull();
  });
  it("does not attach another question's answer or duration", () => {
    const q = { question: "Different question?" } as InterviewReport["questions"][number];
    expect(answerEvidence(q, turns)).toEqual({ answer: null, duration_s: null, response_latency_s: null });
    expect(answerEvidence({ ...q, question: "Why MBA?" }, turns)).toMatchObject({ answer: "Um actually I want to lead", duration_s: 10, response_latency_s: 2 });
  });
});