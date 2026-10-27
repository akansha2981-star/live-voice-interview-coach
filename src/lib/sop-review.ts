import { z } from "zod";

const score = z.object({ score: z.number().int().min(0).max(100), comment: z.string() });

export const sopReportSchema = z.object({
  is_sop: z.boolean(),
  invalid_reason: z.string().nullable(),
  overall_score: z.number().int().min(0).max(100),
  summary: z.string(),
  word_count: z.number().int().min(0),
  categories: z.object({
    relevance: score, clarity: score, storytelling: score, authenticity: score, motivation: score, career_goals: score,
    experience: score, achievements: score, college_fit: score, structure: score, grammar: score, readability: score, overall_impact: score,
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  line_feedback: z.array(z.object({ original: z.string(), whats_wrong: z.string(), why: z.string(), how_to_improve: z.string(), suggestion: z.string() })),
  add_points: z.array(z.string()),
  remove_points: z.array(z.string()),
  clarify_points: z.array(z.string()),
  strengthen_points: z.array(z.string()),
  college_fit_notes: z.string(),
});
export type SopReport = z.infer<typeof sopReportSchema>;

export const SOP_CATEGORY_LABELS: Record<keyof SopReport["categories"], string> = {
  relevance: "Relevance", clarity: "Clarity", storytelling: "Storytelling", authenticity: "Authenticity", motivation: "Motivation",
  career_goals: "Career goals", experience: "Academic & professional experience", achievements: "Achievements", college_fit: "College fit",
  structure: "Structure", grammar: "Grammar", readability: "Readability", overall_impact: "Overall impact",
};

export const SOP_FILE_TYPES = /\.(pdf|docx?|txt|png|jpe?g|webp)$/i;

/** Status label shown to students; a review past its expected time is "Delayed", never falsely complete. */
export function sopStatusLabel(r: { status: string; expected_by: string }, now = Date.now()) {
  if (r.status === "completed") return "Review Completed";
  if (r.status === "failed") return "Review Failed";
  return new Date(r.expected_by).getTime() < now ? "Review Delayed" : "SOP Under Review";
}
