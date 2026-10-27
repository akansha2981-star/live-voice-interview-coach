import { estimateUsage, type Product, type Rate } from "./finance";
export type Attribution = { product: Exclude<Product,"shared">; userId: string; transactionId: string; service: string };
export async function recordUsage(input: { eventKey: string; model: string; attribution: Attribution; status: "started" | "completed" | "failed" | "unconfirmed"; finalized: boolean; occurredAt: string; inputTokens?: number; outputTokens?: number; cachedInputTokens?: number; reasoningTokens?: number; seconds?: number }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = { event_key: input.eventKey, model: input.model, provider: "Lovable AI", product: input.attribution.product, user_id: input.attribution.userId, transaction_id: input.attribution.transactionId, service: input.attribution.service, status: input.status, finalized: input.finalized, occurred_at: input.occurredAt, input_tokens: input.inputTokens ?? null, output_tokens: input.outputTokens ?? null, cached_input_tokens: input.cachedInputTokens ?? null, reasoning_tokens: input.reasoningTokens ?? null, seconds: input.seconds ?? null };
    const { data: existing, error: readError } = await supabaseAdmin.from("finance_usage").select("id,finalized").eq("event_key",input.eventKey).maybeSingle();
    if (readError) throw readError;
    if (existing?.finalized) return;
    const {data:rates,error:rateError} = await supabaseAdmin.from("finance_rates").select("*").eq("provider",row.provider).eq("model",row.model).eq("service",row.service).lte("effective_at",row.occurred_at).order("effective_at",{ascending:false}).limit(100);
    if(rateError) throw rateError;
    const priced = estimateUsage(row, (rates ?? []) as Rate[]);
    const values = {...row, estimates:priced.estimates, pricing_snapshot:priced.snapshot as never};
    const {error} = existing ? await supabaseAdmin.from("finance_usage").update(values).eq("id",existing.id).eq("finalized",false) : await supabaseAdmin.from("finance_usage").insert(values);
    if(error && error.code!=="23505") throw error;
  } catch { console.error("Finance usage recording failed; cost coverage may be incomplete."); }
}