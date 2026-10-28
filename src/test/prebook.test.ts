import { describe, expect, it } from "vitest";
import { normalizeIndianMobile, PREBOOK_AMOUNT_RUPEES } from "@/lib/prebook";
describe("prebook", () => {
  it("costs exactly ₹1", () => expect(PREBOOK_AMOUNT_RUPEES).toBe(1));
  it("accepts Indian mobile formats", () => {
    expect(normalizeIndianMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("9876543210");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeIndianMobile("12345")).toBeNull();
    expect(normalizeIndianMobile("5876543210")).toBeNull();
  });
});
