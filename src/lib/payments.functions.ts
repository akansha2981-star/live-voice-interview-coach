import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Online payments are not configured yet.");
  return { id, secret, auth: `Basic ${btoa(`${id}:${secret}`)}` };
}

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const createCourseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ courseId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: course, error } = await context.supabase.from("courses").select("id, name, credits, final_price, status").eq("id", data.courseId).eq("status", "live").maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) throw new Error("This course is not available.");
    const k = keys();
    const amount = Math.round(Number(course.final_price) * 100);
    const res = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: k.auth, "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency: "INR", receipt: `c_${Date.now()}`, notes: { course_id: course.id, user_id: context.userId, interview_credits: String(course.credits), course_name: course.name } }) });
    const order = (await res.json()) as { id?: string; error?: { description?: string } };
    if (!res.ok || !order.id) throw new Error(order.error?.description ?? "Could not start payment.");
    return { orderId: order.id, amount, keyId: k.id, courseName: course.name };
  });

export const verifyCoursePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ orderId: z.string().min(1).max(64), paymentId: z.string().min(1).max(64), signature: z.string().min(1).max(256) }).parse(i))
  .handler(async ({ data, context }) => {
    const k = keys();
    if ((await hmacHex(k.secret, `${data.orderId}|${data.paymentId}`)) !== data.signature) throw new Error("Payment could not be verified.");
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(data.orderId)}`, { headers: { Authorization: k.auth } });
    const order = (await res.json()) as { amount: number; amount_paid: number; currency: string; status: string; notes?: { course_id?: string; user_id?: string; interview_credits?: string; course_name?: string } };
    if (!res.ok || order.notes?.user_id !== context.userId || order.amount_paid < order.amount || order.status !== "paid" || order.currency !== "INR") throw new Error("Payment could not be verified.");
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(data.paymentId)}`, { headers: { Authorization: k.auth } });
    const payment = await paymentRes.json() as { order_id?: string; amount?: number; currency?: string; status?: string };
    if (!paymentRes.ok || payment.order_id !== data.orderId || payment.status !== "captured" || payment.amount !== order.amount || payment.currency !== "INR") throw new Error("Payment capture could not be verified.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("course_purchases").select("id").eq("order_id", data.orderId).maybeSingle();
    if (existing) return { ok: true };
    const { data: course } = await supabaseAdmin.from("courses").select("id, name, credits").eq("id", order.notes?.course_id ?? "").maybeSingle();
    if (!course) throw new Error("Course not found. Contact support with your payment ID.");
    const credits = order.notes?.interview_credits == null ? course.credits : Number(order.notes.interview_credits);
    if (!Number.isInteger(credits) || credits < 0) throw new Error("Invalid course entitlement.");
    const { error } = await supabaseAdmin.rpc("complete_course_payment", { _user_id: context.userId, _course_id: course.id, _order_id: data.orderId, _payment_id: data.paymentId, _amount: order.amount / 100, _currency: order.currency, _credits: credits, _course_name: order.notes?.course_name ?? course.name });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
