export const PRODUCTS = { interview: "AI interviews", resume: "Resume Builder", sop: "AI SOP Review", training: "AI training", profile_resume: "Profile resume", shared: "Shared expenses" } as const;
export type Product = keyof typeof PRODUCTS;
export type Currency = "INR" | "USD" | "credits";
export type Rate = { id: string; provider: string; model: string; service: string; unit: string; currency: Currency; unit_price: number; per_quantity: number; effective_at: string };
export type Usage = { id: string; event_key: string; occurred_at: string; provider: string; model: string; service: string; product: Product; user_id: string | null; transaction_id: string | null; status: string; input_tokens: number | null; output_tokens: number | null; cached_input_tokens: number | null; reasoning_tokens: number | null; seconds: number | null; finalized: boolean; estimates: Partial<Record<Currency, number>>; expense_id: string | null };
export type Expense = { id: string; occurred_at: string; category: string; product: Product; provider: string; amount: number; currency: Currency; reference: string; notes: string; source: string; voided_at: string | null };
export type Balance = { id: string; provider: string; balance: number; currency: Currency; spending_limit: number | null; as_of: string; notes: string };
export type Activity = { id: string; product: Product; user_id: string | null; status: string; occurred_at: string; duration_s: number | null };
export function financeAccess(roles: string[]) { return { read: roles.some(r => ["admin", "operations_admin", "analyst"].includes(r)), write: roles.some(r => ["admin", "operations_admin"].includes(r)) }; }
export function money(value: number | null | undefined, currency: Currency) {
  if (value == null) return "Unavailable";
  return currency === "credits" ? `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} credits` : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
export function estimateUsage(usage: Pick<Usage, "provider" | "model" | "service" | "occurred_at" | "input_tokens" | "output_tokens" | "cached_input_tokens" | "seconds">, rates: Rate[]) {
  const matching = rates.filter(r => r.provider === usage.provider && r.model === usage.model && r.service === usage.service && r.effective_at <= usage.occurred_at).sort((a,b) => b.effective_at.localeCompare(a.effective_at));
  const estimates: Partial<Record<Currency, number>> = {};
  const snapshot: Rate[] = [];
  for (const currency of ["INR", "USD", "credits"] as const) {
    const find = (unit: string) => matching.find(r => r.currency === currency && r.unit === unit);
    const quantities: [string, number | null][] = usage.service === "live_voice" ? [["seconds", usage.seconds == null ? null : Math.max(15, usage.seconds)]] : [["input_tokens", usage.input_tokens == null ? null : usage.input_tokens - (usage.cached_input_tokens ?? 0)], ["cached_input_tokens", usage.cached_input_tokens ?? 0], ["output_tokens", usage.output_tokens]];
    let total = 0; let complete = true; const used: Rate[] = [];
    for (const [unit, quantity] of quantities) {
      if (quantity == null || quantity < 0) { complete = false; break; }
      if (quantity === 0) continue;
      const rate = find(unit);
      if (!rate) { complete = false; break; }
      total += quantity * Number(rate.unit_price) / Number(rate.per_quantity); used.push(rate);
    }
    if (complete && (used.length || quantities.every(([,q]) => q === 0) && matching.some(r => r.currency === currency))) { estimates[currency] = total; snapshot.push(...used); }
  }
  return { estimates, snapshot };
}
export function summarizeFinance(usage: Usage[], expenses: Expense[], currency: Currency) {
  const billed = expenses.filter(e => !e.voided_at && e.currency === currency);
  const pending = usage.filter(u => !u.expense_id);
  const priced = pending.filter(u => u.estimates[currency] != null);
  return { billed: billed.length ? billed.reduce((s,e) => s + Number(e.amount),0) : null, estimated: priced.length ? priced.reduce((s,u) => s + Number(u.estimates[currency]),0) : null, unknown: pending.filter(u => u.estimates[currency] == null).length, reconciled: usage.filter(u => !!u.expense_id).length };
}
export function interviewProjection(activity: Activity[], usage: Usage[], currency: Currency, minutes: number) {
  const eligible = activity.filter(a => a.product === "interview" && a.status === "completed" && a.duration_s != null && a.duration_s > 0);
  const complete = eligible.flatMap(a => { const records = usage.filter(u => u.product === "interview" && u.transaction_id === a.id); if (!records.some(u => u.service === "live_voice") || !records.some(u => u.service === "report") || records.some(u => !u.finalized || u.estimates[currency] == null)) return []; return [{ cost: records.reduce((s,u) => s + Number(u.estimates[currency]), 0), seconds: a.duration_s ?? 0 }]; });
  if (!complete.length) return null;
  return complete.reduce((s,a) => s+a.cost,0) / complete.reduce((s,a) => s+a.seconds,0) * minutes * 60;
}