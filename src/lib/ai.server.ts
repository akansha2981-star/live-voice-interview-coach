import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod";
import { recordUsage, type Attribution } from "./finance.server";

// All text AI runs on the owner's own OpenAI account (OPENAI_API_KEY), billed by OpenAI directly.
const OPENAI_BASE = "https://api.openai.com/v1";
export const CHAT_MODEL = "gpt-5.5";

// Streams a strict structured-output request through OpenAI Responses and returns the parsed object.
export async function generateStructured<T extends z.ZodTypeAny>(opts: {
  schema: T;
  system: string;
  messages: ModelMessage[];
  effort?: "low" | "medium" | "high";
  attribution: Attribution;
  onPartial?: (partial: unknown) => Promise<void>;
}): Promise<z.infer<T>> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app.");
  const eventKey = `structured:${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();
  await recordUsage({eventKey, occurredAt, model:CHAT_MODEL, attribution:opts.attribution, status:"started", finalized:false});
  const provider = createOpenAI({
    baseURL: OPENAI_BASE,
    apiKey: key,
  });
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system: opts.system,
    messages: opts.messages,
    maxRetries: 0,
    output: Output.object({ schema: opts.schema }),
    providerOptions: {
      openai: {
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
    if (status === 401) throw new Error("The OpenAI key is invalid or revoked.");
    if (status === 402 || (streamError as { data?: { error?: { code?: string } } }).data?.error?.code === "insufficient_quota") throw new Error("The OpenAI account has run out of credit. Please top up the OpenAI billing balance.");
    if (status === 429) throw new Error("The AI service is busy. Please try again in a minute.");
    if (status === 403) throw new Error("The OpenAI account refused this request.");
    throw new Error("The AI service could not complete the request.");
  }
  if (!output) throw new Error("The AI returned an incomplete result. Please retry.");
  return output;
}
