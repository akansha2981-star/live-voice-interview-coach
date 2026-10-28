import { describe, expect, it } from "vitest";
import { comparisonRows, coursePurchaseDestination } from "@/lib/course-comparison";
import type { PublicCourse } from "@/lib/public-courses.functions";
const course = (id: string, deliverables: PublicCourse["deliverables"]): PublicCourse => ({ id, name: id, actual_price: 100, final_price: 100, credits: 1, description: null, deliverables });
describe("Public course comparison", () => {
  it("compares published deliverables without inventing inclusions", () => {
    expect(comparisonRows([course("A", [{ item: "SOP", detail: "1 review" }]), course("B", [{ item: "Interview", detail: "5 credits" }])])).toEqual([
      { label: "SOP", values: ["1 review", "Not listed"] }, { label: "Interview", values: ["Not listed", "5 credits"] },
    ]);
  });
  it("requires signed-out buyers to log in before accessing purchase", () => {
    expect(coursePurchaseDestination(false)).toBe("/auth");
    expect(coursePurchaseDestination(true)).toBe("/slots");
  });
});