import { expect, it } from "vitest";
import { freeSopAllowance, availableSopSlot } from "@/lib/review-benefits";
it("starts with two free SOP reviews including one reserved for NMIMS", () => {
  expect(freeSopAllowance([])).toEqual({ general: 1, nmims: 1, total: 2 });
  expect(availableSopSlot(freeSopAllowance([]), "NMIMS Mumbai")).toBe("nmims");
});
it("does not spend the reserved NMIMS review on another college", () => {
  const allowance = freeSopAllowance([{ status: "completed", free_credit_slot: "general" }]);
  expect(availableSopSlot(allowance, "IIM Ahmedabad")).toBe(null);
  expect(availableSopSlot(allowance, "NMIMS")).toBe("nmims");
});
it("restores failed review allowances and excludes historical unassigned reviews", () => {
  expect(freeSopAllowance([{ status: "failed", free_credit_slot: "general" }, { status: "completed" }]).total).toBe(2);
});
it("has no free reviews after both slots are completed or reserved", () => {
  expect(freeSopAllowance([{ status: "completed", free_credit_slot: "general" }, { status: "under_review", free_credit_slot: "nmims" }]).total).toBe(0);
});