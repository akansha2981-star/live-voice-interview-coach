import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Add / deduct credits through the transaction-safe database function (mandatory reason, audit logged). */
export function CreditAdjuster({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(1); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const { data: balance } = useQuery({ queryKey: ["admin", "balance", userId], queryFn: async () => { const { data } = await supabase.rpc("credit_balance", { _user_id: userId }); return (data as number) ?? 0; } });
  async function apply(sign: 1 | -1) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000) return toast.error("Enter a whole number between 1 and 1000.");
    if (reason.trim().length < 3) return toast.error("A reason is required for every adjustment.");
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_adjust_credits", { _user_id: userId, _delta: sign * amount, _reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`New balance: ${data} credits`); setReason("");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }
  return <div className="rounded-lg border bg-secondary/40 p-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Adjust interview credits</h3><p className="text-sm">Current balance <strong className="text-lg text-primary tabular-nums">{balance ?? "—"}</strong></p></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr]">
      <Input type="number" min={1} max={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Credits" />
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required), e.g. Complimentary credit" maxLength={200} aria-label="Reason" />
    </div>
    <div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busy || (balance ?? 0) < amount} onClick={() => apply(-1)}>Deduct {amount}</Button><Button size="sm" disabled={busy} onClick={() => apply(1)}>Add {amount}</Button></div>
  </div>;
}
