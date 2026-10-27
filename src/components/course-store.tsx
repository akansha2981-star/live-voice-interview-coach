import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCourseOrder, verifyCoursePayment } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
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

export type Deliverable = { item: string; detail: string };
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export function CourseStore({ email, name }: { email?: string | null; name?: string | null }) {
  const qc = useQueryClient();
  const createOrder = useServerFn(createCourseOrder);
  const verify = useServerFn(verifyCoursePayment);
  const [busy, setBusy] = useState<string | null>(null);
  const { data: courses = [], isLoading } = useQuery({ queryKey: ["courses", "live"], queryFn: async () => { const { data, error } = await supabase.from("courses").select("*").eq("status", "live").order("sort_order").order("final_price"); if (error) throw error; return data; } });

  async function buy(courseId: string) {
    setBusy(courseId);
    try {
      const [Rzp, order] = await Promise.all([loadRazorpay(), createOrder({ data: { courseId } })]);
      const rzp = new Rzp({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: "INR", name: "MBA Compass", description: order.courseName,
        prefill: { email: email ?? undefined, name: name ?? undefined }, theme: { color: "#1d4ed8" },
        handler: async (r: RzpResponse) => {
          try { await verify({ data: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }); toast.success("Payment successful. Credits added to your account."); await qc.invalidateQueries(); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Payment verification failed."); }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. No money was taken, or it will be refunded automatically."));
      rzp.open();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not start payment."); }
    finally { setBusy(null); }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading courses…</p>;
  if (!courses.length) return <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">No courses are available right now.</p>;
  return <div className="grid gap-4 md:grid-cols-3">{courses.map((c, i) => {
    const rows = (c.deliverables as unknown as Deliverable[]) ?? [];
    const off = Number(c.actual_price) > Number(c.final_price) ? Math.round((1 - Number(c.final_price) / Number(c.actual_price)) * 100) : 0;
    return <div key={c.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-rise flex flex-col rounded-lg border bg-card p-6">
      <p className="text-xs font-semibold uppercase text-primary">{c.credits} interview credit{c.credits === 1 ? "" : "s"}</p>
      <h3 className="mt-1 text-xl font-bold">{c.name}</h3>
      <p className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-bold text-primary">{inr(c.final_price)}</span>{off > 0 && <><span className="text-sm text-muted-foreground line-through">{inr(c.actual_price)}</span><span className="text-xs font-semibold text-success">{off}% off</span></>}</p>
      {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
      {rows.length > 0 && <table className="mt-4 w-full text-left text-sm"><tbody className="divide-y border-y">{rows.map((r, j) => <tr key={j}><td className="py-2 pr-3 font-semibold">{r.item}</td><td className="py-2 text-muted-foreground">{r.detail}</td></tr>)}</tbody></table>}
      <Button className="mt-6 w-full" disabled={busy !== null} onClick={() => buy(c.id)}>{busy === c.id ? "Opening payment…" : "Buy now"}</Button>
    </div>;
  })}</div>;
}
