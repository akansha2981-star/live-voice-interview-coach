import { describe, expect, it } from "vitest";
import { dueReminder, fillPlaceholders } from "./email-content";

const MIN = 60000;
const start = 1_000_000_000_000;

describe("slot reminders", () => {
  it("sends the 10-minute reminder 10 minutes before the slot", () => {
    expect(dueReminder(start, start - 60 * MIN, start - 10 * MIN)).toBe("10");
  });
  it("sends the 5-minute reminder 5 minutes before the slot", () => {
    expect(dueReminder(start, start - 60 * MIN, start - 5 * MIN)).toBe("5");
  });
  it("sends nothing for a slot booked to start now", () => {
    expect(dueReminder(start, start - 2 * MIN, start - 2 * MIN)).toBeNull();
  });
});

describe("placeholders", () => {
  it("fills admin-edited text", () => {
    expect(fillPlaceholders("Hi {{name}}, score {{ score }}", { name: "Asha", score: 82 })).toBe("Hi Asha, score 82");
  });
});
