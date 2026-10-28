import { describe, expect, it } from "vitest";
import { VIDEO_DEMO_DURATION, videoDemoSnapshot } from "../lib/course-video-demo";

describe("recorded 30-second interview preview", () => {
  it("uses the actual 30.08-second media duration", () => {
    expect(VIDEO_DEMO_DURATION).toBe(30.08);
    expect(videoDemoSnapshot(60).seconds).toBe(30.08);
  });
  it("counts only candidate words whose verified captions have appeared", () => {
    expect(videoDemoSnapshot(4).wordCount).toBe(0);
    expect(videoDemoSnapshot(5).wordCount).toBe(2);
    expect(videoDemoSnapshot(30).wordCount).toBe(55);
    expect(videoDemoSnapshot(30).turns.filter(turn => turn.speaker === "Candidate").reduce((n, turn) => n + turn.text.split(/\s+/).filter(Boolean).length, 0)).toBe(55);
  });
  it("makes visual indicators unavailable when the candidate leaves the frame", () => {
    const away = videoDemoSnapshot(19.2);
    expect(away.face).toBe(false);
    expect(away.eye).toBeNull();
    expect(away.posture).toBeNull();
    expect(away.blinks).toBeNull();
  });
  it("restores visual indicators after the candidate returns", () => {
    const back = videoDemoSnapshot(22.3);
    expect(back.face).toBe(true);
    expect(back.eye).toBe(91);
    expect(back.posture).toBe(92);
  });
});