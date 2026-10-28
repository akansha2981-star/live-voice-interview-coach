import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../lib/course-demo";

describe("scripted interview preview", () => {
  it("counts only the displayed transcript words", () => {
    expect(demoSnapshot(0, 0).wordCount).toBe(0);
    const complete = demoSnapshot(0, 16);
    expect(complete.wordCount).toBe(31);
    expect(complete.text.split(/\s+/)).toHaveLength(31);
  });
  it("does not invent camera metrics or speech while the candidate is absent", () => {
    const absent = demoSnapshot(3, 16);
    expect(absent.scene.eye).toBeNull();
    expect(absent.scene.posture).toBeNull();
    expect(absent.visualStatus).toBe("Unavailable");
    expect(absent.text).toBe("");
    expect(absent.wordCount).toBe(demoSnapshot(3, 0).wordCount);
  });
  it("resumes visual tracking when the candidate returns", () => {
    expect(demoSnapshot(4, 0).scene.face).toBe(true);
    expect(demoSnapshot(4, 0).visualStatus).toBe("Tracking");
  });
});