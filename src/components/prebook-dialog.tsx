import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPrebookOtp, verifyPrebookOtp, confirmPrebookPayment } from "@/lib/prebook.functions";
import { normalizeIndianMobile } from "@/lib/prebook";

type RzpCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
function loadRazorpay() {
  return new Promise<RzpCtor>((resolve, reject) => {
    const w = window as typeof window & { Razorpay?: RzpCtor };
    if (w.Razorpay) return resolve(w.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Payment window failed to load.")));
    s.onerror = () => reject(new Error("Payment window failed to load."));
    document.body.appendChild(s);
  });
}

type Step = "details" | "otp" | "done";

export function PrebookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const send = useServerFn(sendPrebookOtp);
  const verify = useServerFn(verifyPrebookOtp);
  const confirm = useServerFn(confirmPrebookPayment);
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [otp, setOtp] = useState("");
  const [prebookId, setPrebookId] = useState<string>();
  const [masked, setMasked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState<string>('pending');
  const [receipt, setReceipt] = useState<{ prebookId: string; orderId: string; paymentId: string; signature: string }>();

  const msg = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");

  async function requestOtp() {
    setError("");
    if (form.name.trim().length < 2) return setError("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Enter a valid email.");
    if (!normalizeIndianMobile(form.phone)) return setError("Enter a valid 10-digit Indian mobile number.");
    setBusy(true);
    try { const r = await send({ data: { ...form, prebookId } }); setPrebookId(r.prebookId); setMasked(r.maskedPhone); setStep("otp"); setOtp(""); }
    catch (e) { msg(e); } finally { setBusy(false); }
  }

  async function verifyAndPay() {
    setError("");
    if (!/^\d{6}$/.test(otp) || !prebookId) return setError("Enter the 6-digit OTP.");
    setBusy(true);
    try {
      const [Rzp, order] = await Promise.all([loadRazorpay(), verify({ data: { prebookId, otp } })]);
      const rzp = new Rzp({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: "INR", name: "MBA Compass", description: "Early-bird pre-booking",
        prefill: { name: order.name, email: order.email, contact: `+91${order.phone}` },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try { const payment = { prebookId, orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }; setReceipt(payment); const result = await confirm({ data: payment }); setEmailStatus(result.emailStatus); setBusy(false); setStep("done"); }
          catch (e) { msg(e); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => setError("Payment failed. No money was taken, or it will be refunded automatically."));
      rzp.open();
    } catch (e) { msg(e); setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="prebook-dialog sm:max-w-md">
      <DialogHeader>
        <p className="course-eyebrow">EARLY-BIRD · LIMITED SPOTS</p>
        <DialogTitle className="text-2xl">{step === "done" ? "Your spot is reserved." : "Pre-book now at just ₹1"}</DialogTitle>
        <DialogDescription>{step === "done" ? "Thank you. We've saved your early-bird spot and will contact you with next steps." : "Reserve your early-bird spot for MBA Compass AI mock interviews."}</DialogDescription>
      </DialogHeader>
      <ol className="prebook-steps" aria-label="Pre-booking steps">{["Your details", "Verify mobile", "Pay ₹1"].map((s, i) => <li key={s} className={(step === "details" ? 0 : step === "otp" ? 1 : 3) >= i ? "is-on" : ""}><span>{i + 1}</span>{s}</li>)}</ol>
      {step === "details" && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void requestOtp(); }}>
        <div><Label htmlFor="pb-name">Full name</Label><Input id="pb-name" autoComplete="name" maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label htmlFor="pb-email">Email</Label><Input id="pb-email" type="email" autoComplete="email" maxLength={160} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label htmlFor="pb-phone">Mobile number</Label><div className="flex gap-2"><span className="grid place-items-center rounded-md border px-3 text-sm text-muted-foreground">+91</span><Input id="pb-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Sending OTP…" : "Send OTP"}</Button>
      </form>}
      {step === "otp" && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void verifyAndPay(); }}>
        <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {masked}.</p>
        <Input aria-label="OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center text-2xl tracking-[0.5em]" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Please wait…" : "Verify & pay ₹1"}</Button>
        <div className="flex justify-between text-sm"><button type="button" className="text-primary underline" onClick={() => { setStep("details"); setError(""); }}>Change details</button><button type="button" className="text-primary underline" disabled={busy} onClick={() => void requestOtp()}>Resend OTP</button></div>
      </form>}
      {step === 'done' && <div className="space-y-3">
        <p role="status" className="text-sm text-muted-foreground">{emailStatus === 'sent' ? `Your confirmation email has been sent to ${form.email}.` : emailStatus === 'pending' ? 'Your payment is confirmed. The confirmation email could not be sent yet; you do not need to pay again.' : 'Your payment is confirmed. Email notifications are unavailable for this address.'}</p>
        {emailStatus === 'pending' && receipt && <Button variant="secondary" className="w-full" disabled={busy} onClick={async () => { setBusy(true); try { const result = await confirm({ data: receipt }); setEmailStatus(result.emailStatus); } catch (e) { msg(e); } finally { setBusy(false); } }}>{busy ? 'Please wait…' : 'Retry confirmation email'}</Button>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" size="lg" onClick={() => onOpenChange(false)}>Done</Button>
      </div>}
      <p className="text-xs text-muted-foreground">₹1 reserves an early-bird spot only. It does not include interview credits.</p>
    </DialogContent>
  </Dialog>;
}
