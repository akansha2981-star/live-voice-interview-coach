import { expect, it } from "vitest";
import { interviewPackPrice } from "@/lib/pricing";
it("charges the requested 100 rupees per interview without invented pack discounts", () => { expect(interviewPackPrice(1)).toBe(100); expect(interviewPackPrice(5)).toBe(500); expect(interviewPackPrice(10)).toBe(1000); });