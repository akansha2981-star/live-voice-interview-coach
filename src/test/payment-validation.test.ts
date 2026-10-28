import { expect, it } from "vitest";
import { verifiedCapturedPayment } from "@/lib/payment-validation";
const order = { amount: 9900, amount_paid: 9900, currency: "INR", status: "paid", notes: { user_id: "student" } };
const payment = { order_id: "order", amount: 9900, currency: "INR", status: "captured" };
it("accepts the captured 99 rupee mock and 799 rupee course only for the owning student", () => {
  expect(verifiedCapturedPayment(order, payment, "student", "order")).toBe(true);
  expect(verifiedCapturedPayment({ ...order, amount: 79900, amount_paid: 79900 }, { ...payment, amount: 79900 }, "student", "order")).toBe(true);
  expect(verifiedCapturedPayment(order, payment, "other", "order")).toBe(false);
});
it("rejects amount, order, currency and capture mismatches", () => {
  expect(verifiedCapturedPayment(order, { ...payment, amount: 10000 }, "student", "order")).toBe(false);
  expect(verifiedCapturedPayment(order, { ...payment, order_id: "other" }, "student", "order")).toBe(false);
  expect(verifiedCapturedPayment(order, { ...payment, currency: "USD" }, "student", "order")).toBe(false);
  expect(verifiedCapturedPayment(order, { ...payment, status: "authorized" }, "student", "order")).toBe(false);
});