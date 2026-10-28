import { expect, it } from "vitest";
import { interviewPackPrice, GDPI_COURSE_PRICE_INR, RESUME_REVIEW_PRICE_INR, FREE_SOP_CREDITS, NMIMS_RESERVED_SOP_CREDITS } from "@/lib/pricing";
it("charges 99 rupees per mock interview", () => { expect(interviewPackPrice(1)).toBe(99); expect(interviewPackPrice(5)).toBe(495); expect(interviewPackPrice(10)).toBe(990); });
it("prices the GDPI course at 799 rupees", () => { expect(GDPI_COURSE_PRICE_INR).toBe(799); });
it("makes resume reviews free", () => { expect(RESUME_REVIEW_PRICE_INR).toBe(0); });
it("includes two free SOP credits", () => { expect(FREE_SOP_CREDITS).toBe(2); });
it("reserves one SOP credit for NMIMS", () => { expect(NMIMS_RESERVED_SOP_CREDITS).toBe(1); });