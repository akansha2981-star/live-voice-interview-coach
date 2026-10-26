import { describe, expect, it } from "vitest";
import { categoryScores, compareLatest, measuredMoments, scoreDelta, splitReviews, strongestWeakest, type ScoredInterview } from "@/lib/dashboard-insights";

describe("dashboard insights", () => {
  it("averages three questions per category", () => {
    expect(categoryScores([{ section: "resume", score: 60 }, { section: "resume", score: 70 }, { section: "resume", score: 80 }, { section: "practical", score: 50 }])).toEqual({ resume: 70, practical: 50, general_knowledge: null });
  });
  it("finds strongest and weakest area", () => {
    const r = strongestWeakest({ resume: 70, practical: 50, general_knowledge: 60 });
    expect(r.strongest?.key).toBe("resume");
    expect(r.weakest?.key).toBe("practical");
  });
  it("computes score difference only with a baseline", () => {
    expect(scoreDelta(68, 58)).toBe(10);
    expect(scoreDelta(68, null)).toBeNull();
  });
  it("compares latest with previous interview chronologically", () => {
    const mk = (id: string, d: string, s: number, cs: Record<string, number>) => ({ id, started_at: d, overall_score: s, report: { category_scores: cs } }) as unknown as ScoredInterview;
    const c = compareLatest([mk("a", "2026-01-01", 58, { resume: 50, practical: 60, general_knowledge: 60 }), mk("b", "2026-02-01", 68, { resume: 70, practical: 55, general_knowledge: 60 })]);
    expect(c?.delta).toBe(10);
    expect(c?.improved?.key).toBe("resume");
    expect(c?.attention?.key).toBe("practical");
  });
  it("flags a measured long pause of 5+ seconds", () => {
    const m = measuredMoments([{ role: "assistant", text: "Q?", start_ms: 0, end_ms: 2000 }, { role: "user", text: "ok answer", start_ms: 9000, end_ms: 11000 }]);
    expect(m[0].kind).toBe("pause");
    expect(m[0].timestamp_s).toBe(9);
  });
  it("does not flag short gaps", () => {
    expect(measuredMoments([{ role: "assistant", text: "Q?", start_ms: 0, end_ms: 2000 }, { role: "user", text: "ok", start_ms: 4000, end_ms: 5000 }])).toHaveLength(0);
  });
  it("moves reviewed items out of pending", () => {
    const items = [{ key: "a:0" }, { key: "a:1" }] as never;
    const r = splitReviews(items, new Set(["a:0"]));
    expect(r.pending).toHaveLength(1);
    expect(r.done).toHaveLength(1);
  });
});
