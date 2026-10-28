import { expect, it } from "vitest";
import { canEnterWorkspace } from "@/lib/workspace-access";

it("allows an approved dashboard-only exception before launch without a course or staff role", () => {
  expect(canEnterWorkspace(false, false, false, true)).toBe(true);
});
it("keeps other students without a course locked before launch", () => {
  expect(canEnterWorkspace(false, false, false, false)).toBe(false);
});
it("preserves purchased-course, staff and launch access", () => {
  expect(canEnterWorkspace(false, false, true, false)).toBe(true);
  expect(canEnterWorkspace(false, true, false, false)).toBe(true);
  expect(canEnterWorkspace(true, false, false, false)).toBe(true);
});