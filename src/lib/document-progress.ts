import { z } from "zod";

export const documentEvidenceSchema = z.object({
  source_text: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string(), quote: z.string() })),
});
export type DocumentEvidence = z.infer<typeof documentEvidenceSchema>;
export type ReviewProgress = { phase: "reading" | "analysing" | "complete" | "failed"; sections: Record<string, unknown>; updatedAt: string };

/** Only complete, schema-valid fields from a partial model object are exposed. */
export function validatedSections(schema: z.AnyZodObject, partial: unknown, validKey: string) {
  if (!partial || typeof partial !== "object" || (partial as Record<string, unknown>)[validKey] !== true) return {};
  const source = partial as Record<string, unknown>;
  // The newest JSON field can contain an unfinished string/array that still parses.
  // Expose it only after the next field starts, or through the final complete report.
  const newestKey = Object.keys(source).at(-1);
  const sections: Record<string, unknown> = {};
  for (const [key, validator] of Object.entries(schema.shape) as [string, z.ZodTypeAny][]) {
    if (key === newestKey) continue;
    const result = validator.safeParse(source[key]);
    if (result.success) sections[key] = result.data;
  }
  return sections;
}

export function evidenceFacts(value: unknown): DocumentEvidence | null {
  const parsed = documentEvidenceSchema.safeParse(value);
  if (!parsed.success) return null;
  return { ...parsed.data, facts: parsed.data.facts.filter((f) => f.quote.trim().length > 0 && parsed.data.source_text.includes(f.quote)) };
}

export function exactQuoteRange(text: string, quote: string) {
  if (!quote.trim()) return null;
  const start = text.indexOf(quote);
  return start < 0 ? null : { start, end: start + quote.length };
}