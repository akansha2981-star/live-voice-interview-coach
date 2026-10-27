import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod";
import { recordUsage, type Attribution } from "./finance.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const CHAT_MODEL = "openai/gpt-6-astra";

// Streams a strict structured-output request through the Lovable AI Gateway and returns the parsed object.
export async function generateStructured<T extends z.ZodTypeAny>(opts: {
  schema: T;
  system: string;
  messages: ModelMessage[];
  effort?: "low" | "medium" | "high";
  attribution: Attribution;
  onPartial?: (partial: unknown) => Promise<void>;
}): Promise<z.infer<T>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app.");
  const eventKey = `structured:${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();
  await recordUsage({eventKey, occurredAt, model:CHAT_MODEL, attribution:opts.attribution, status:"started", finalized:false});
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system: opts.system,
    messages: opts.messages,
    maxRetries: 0,
    output: Output.object({ schema: opts.schema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: opts.effort ?? "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let streamError: unknown;
  const partialWork = opts.onPartial ? (async () => {
    try {
      for await (const partial of result.partialOutputStream) await opts.onPartial?.(partial);
    } catch (error) { streamError ??= error; }
  })() : Promise.resolve();
  try {
    for await (const part of result.fullStream) {
      if (part.type === "error") streamError = part.error;
    }
  } catch (error) { streamError ??= error; }
  await partialWork;
  const usage = await Promise.resolve(result.totalUsage).catch(() => undefined);
  let output: z.infer<T> | undefined;
  if (!streamError) {
    try { output = (await result.output) as z.infer<T>; }
    catch (error) { streamError = error; }
  }
  await recordUsage({eventKey, occurredAt, model:CHAT_MODEL, attribution:opts.attribution, status:streamError || !output?"failed":"completed", finalized:true, inputTokens:usage?.inputTokens, outputTokens:usage?.outputTokens, cachedInputTokens:usage?.inputTokenDetails?.cacheReadTokens, reasoningTokens:usage?.outputTokenDetails?.reasoningTokens});
  if (streamError) {
    if (NoObjectGeneratedError.isInstance(streamError)) throw new Error("The AI returned an incomplete result. Please retry.");
    const status = (streamError as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("AI credits are used up. Please top up in Settings → Plans & credits.");
    if (status === 429) throw new Error("The AI service is busy. Please try again in a minute.");
    if (status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error("The AI service could not complete the request.");
  }
  if (!output) throw new Error("The AI returned an incomplete result. Please retry.");
  return output;
}
