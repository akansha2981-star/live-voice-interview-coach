import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifiedCapturedPayment } from "./payment-validation";
import { PREBOOK_AMOUNT_RUPEES, normalizeIndianMobile } from "./prebook";

const OTP_TTL_MS = 5 * 60_000;
const RESEND_GAP_MS = 45_000;
const MAX_SENDS = 4;
const MAX_ATTEMPTS = 5;

async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function otpSecret() {
  const s = process.env.PREBOOK_OTP_SECRET;
  if (!s) throw new Error("Pre-booking is not configured yet.");
  return s;
}
function rzpKeys() {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Online payments are not configured yet.");
  return { id, secret, auth: `Basic ${btoa(`${id}:${secret}`)}` };
}

async function sendOtpSms(phone: string, otp: string) {
  const username = process.env.HSPSMS_USERNAME, apikey = process.env.HSPSMS_API_KEY, sender = process.env.HSPSMS_SENDER_ID, template = process.env.HSPSMS_OTP_TEMPLATE;
  if (!username || !apikey || !sender || !template) throw new Error("OTP sending is not configured yet.");
  const message = template.replace(/\{#var#\}|\{otp\}/i, otp);
  const params = new URLSearchParams({ username, message, sendername: sender, smstype: "TRANS", numbers: phone, apikey });
  if (process.env.HSPSMS_TEMPLATE_ID) params.set("templateid", process.env.HSPSMS_TEMPLATE_ID);
  if (process.env.HSPSMS_PEID) params.set("peid", process.env.HSPSMS_PEID);
  const res = await fetch(`http://sms.hspsms.com/sendSMS?${params}`);
  const body = await res.text();
  if (!res.ok || /error|invalid|fail/i.test(body)) {
    console.error(`HSPSMS send failed [${res.status}]: ${body.slice(0, 300)}`);
    throw new Error("We couldn't send the OTP. Please check the number and try again.");
  }
}

const details = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(160),
  phone: z.string().trim().max(20),
});

export const sendPrebookOtp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => details.extend({ prebookId: z.string().uuid().optional() }).parse(i))
  .handler(async ({ data }) => {
    const phone = normalizeIndianMobile(data.phone);
    if (!phone) throw new Error("Enter a valid 10-digit Indian mobile number.");
    const secret = otpSecret();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { data: recent } = await db.from("prebookings").select("otp_sent_count").eq("phone", phone).gte("created_at", hourAgo);
    let row: { id: string; otp_sent_count: number; last_otp_sent_at: string | null; status: string } | null = null;
    if (data.prebookId) {
      const { data: r } = await db.from("prebookings").select("id, otp_sent_count, last_otp_sent_at, status, phone").eq("id", data.prebookId).maybeSingle();
      if (r && r.phone === phone && r.status === "pending") row = r;
    }
    const totalRecent = (recent ?? []).reduce((n, r) => n + r.otp_sent_count, 0);
    if (totalRecent >= MAX_SENDS * 2 || (row && row.otp_sent_count >= MAX_SENDS)) throw new Error("Too many OTP requests. Please try again in an hour.");
    if (row?.last_otp_sent_at && Date.now() - new Date(row.last_otp_sent_at).getTime() < RESEND_GAP_MS) throw new Error("Please wait a few seconds before requesting another OTP.");
    if (!row) {
      const { data: created, error } = await db.from("prebookings").insert({ name: data.name, email: data.email, phone }).select("id, otp_sent_count, last_otp_sent_at, status").single();
      if (error) throw new Error("Could not start pre-booking.");
      row = created;
    }
    const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    await sendOtpSms(phone, otp);
    await db.from("prebookings").update({ name: data.name, email: data.email, otp_hash: await sha256(`${row.id}:${otp}:${secret}`), otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(), otp_attempts: 0, otp_sent_count: row.otp_sent_count + 1, last_otp_sent_at: new Date().toISOString() }).eq("id", row.id);
    return { prebookId: row.id, maskedPhone: `+91 ••••••${phone.slice(-4)}` };
  });

export const verifyPrebookOtp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ prebookId: z.string().uuid(), otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP") }).parse(i))
  .handler(async ({ data }) => {
    const secret = otpSecret();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: row } = await db.from("prebookings").select("id, name, email, phone, otp_hash, otp_expires_at, otp_attempts, status, phone_verified_at").eq("id", data.prebookId).maybeSingle();
    if (!row || row.status === "paid") throw new Error("This pre-booking is no longer active.");
    if (!row.phone_verified_at) {
      if (!row.otp_hash || !row.otp_expires_at || new Date(row.otp_expires_at).getTime() < Date.now()) throw new Error("OTP expired. Please request a new one.");
      if (row.otp_attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong attempts. Please request a new OTP.");
      if ((await sha256(`${row.id}:${data.otp}:${secret}`)) !== row.otp_hash) {
        await db.from("prebookings").update({ otp_attempts: row.otp_attempts + 1 }).eq("id", row.id);
        throw new Error("Incorrect OTP. Please try again.");
      }
    }
    const k = rzpKeys();
    const amount = PREBOOK_AMOUNT_RUPEES * 100;
    const res = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: k.auth, "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency: "INR", receipt: `pb_${Date.now()}`, notes: { prebook_id: row.id, kind: "prebook" } }) });
    const order = await res.json() as { id?: string; error?: { description?: string } };
    if (!res.ok || !order.id) { console.error(`Razorpay order failed [${res.status}]`, order.error?.description); throw new Error("Could not start payment."); }
    await db.from("prebookings").update({ phone_verified_at: row.phone_verified_at ?? new Date().toISOString(), otp_hash: null, razorpay_order_id: order.id }).eq("id", row.id);
    return { orderId: order.id, amount, keyId: k.id, name: row.name, email: row.email, phone: row.phone };
  });

export const confirmPrebookPayment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ prebookId: z.string().uuid(), orderId: z.string().min(1).max(64), paymentId: z.string().min(1).max(64), signature: z.string().min(1).max(256) }).parse(i))
  .handler(async ({ data }) => {
    const k = rzpKeys();
    if ((await hmacHex(k.secret, `${data.orderId}|${data.paymentId}`)) !== data.signature) throw new Error("Payment could not be verified.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: row } = await db.from("prebookings").select("id, status, razorpay_order_id").eq("id", data.prebookId).maybeSingle();
    if (!row || row.razorpay_order_id !== data.orderId) throw new Error("Payment could not be verified.");
    if (row.status === "paid") {
      const { sendPaymentConfirmation } = await import('./payment-emails.server');
      return { ok: true, emailStatus: await sendPaymentConfirmation(db, 'prebook', row.id) };
    }
    const oRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(data.orderId)}`, { headers: { Authorization: k.auth } });
    const order = await oRes.json() as { amount: number; amount_paid: number; currency: string; status: string; notes?: { prebook_id?: string; user_id?: string } };
    if (!oRes.ok || order.notes?.prebook_id !== row.id || order.status !== "paid" || order.amount !== PREBOOK_AMOUNT_RUPEES * 100) throw new Error("Payment could not be verified.");
    const pRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(data.paymentId)}`, { headers: { Authorization: k.auth } });
    const payment = await pRes.json() as { order_id?: string; amount?: number; currency?: string; status?: string };
    if (!pRes.ok || !verifiedCapturedPayment({ ...order, notes: { ...order.notes, user_id: row.id } }, payment, row.id, data.orderId)) throw new Error("Payment capture could not be verified.");
    const { error } = await db.from("prebookings").update({ status: "paid", razorpay_payment_id: data.paymentId, amount: order.amount / 100, paid_at: new Date().toISOString() }).eq("id", row.id).neq("status", "paid");
    if (error) throw new Error('Could not record payment. Please retry confirmation; do not pay again.');
    const { sendPaymentConfirmation } = await import('./payment-emails.server');
    return { ok: true, emailStatus: await sendPaymentConfirmation(db, 'prebook', row.id) };
  });
