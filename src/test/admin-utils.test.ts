import { describe, expect, it } from "vitest";
import { dailyAverage, staffAccess, toCsv, validateUpload } from "@/lib/admin-utils";

describe("admin rules", () => {
  it("analysts are staff but cannot change credits or reply to tickets", () => {
    const a = staffAccess(["analyst"]);
    expect(a.isStaff).toBe(true);
    expect(a.canOperate).toBe(false);
    expect(a.canSupport).toBe(false);
  });
  it("support agents can reply but not adjust credits", () => {
    const a = staffAccess(["support_agent"]);
    expect(a.canSupport).toBe(true);
    expect(a.canOperate).toBe(false);
  });
  it("students are not staff", () => {
    expect(staffAccess(["student"]).isStaff).toBe(false);
  });
  it("computes the daily average over the selected range", () => {
    expect(dailyAverage(21, 7)).toBe(3);
    expect(dailyAverage(10, 3)).toBe(3.3);
  });
  it("escapes CSV cells and blocks formula injection", () => {
    expect(toCsv([{ a: "=SUM(1)", b: 'x,"y"' }])).toBe(`a,b\n'=SUM(1),"x,""y"""`);
  });
  it("rejects disallowed or oversized uploads", () => {
    expect(validateUpload(new File(["x"], "a.exe", { type: "application/x-msdownload" }))).not.toBeNull();
    expect(validateUpload(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
  });
});
