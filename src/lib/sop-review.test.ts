import { describe, expect, it } from "vitest";
import { sopStatusLabel } from "./sop-review";

describe("sopStatusLabel", () => {
  const now = Date.parse("2026-10-27T10:00:00Z");
  it("shows under review within the 1 hour TAT", () => expect(sopStatusLabel({ status: "under_review", expected_by: "2026-10-27T10:30:00Z" }, now)).toBe("SOP Under Review"));
  it("shows delayed, not completed, after the TAT passes", () => expect(sopStatusLabel({ status: "under_review", expected_by: "2026-10-27T09:59:00Z" }, now)).toBe("Review Delayed"));
  it("shows completed only when the review is done", () => expect(sopStatusLabel({ status: "completed", expected_by: "2026-10-27T09:00:00Z" }, now)).toBe("Review Completed"));
});
