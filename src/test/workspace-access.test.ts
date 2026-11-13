import { expect, it } from "vitest";
import { canEnterWorkspace, WORKSPACE_OPEN_BEFORE_LAUNCH } from "@/lib/workspace-access";

it("opens the dashboard to every signed-in student before launch", () => {
  expect(WORKSPACE_OPEN_BEFORE_LAUNCH).toBe(true);
  expect(canEnterWorkspace(false, false, false, false)).toBe(true);
});
it("still locks students without a course when the pre-launch lock is switched back on", () => {
  expect(canEnterWorkspace(false, false, false, false, false)).toBe(false);
  expect(canEnterWorkspace(false, false, false, true, false)).toBe(true);
});
it("preserves purchased-course, staff and launch access", () => {
  expect(canEnterWorkspace(false, false, true, false, false)).toBe(true);
  expect(canEnterWorkspace(false, true, false, false, false)).toBe(true);
  expect(canEnterWorkspace(true, false, false, false, false)).toBe(true);
});
