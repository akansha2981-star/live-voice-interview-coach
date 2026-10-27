import { z } from "zod";

const score = z.object({ score: z.number().int().min(0).max(100), comment: z.string() });
const issue = z.object({ issue: z.string(), impact: z.string(), fix: z.string(), example: z.string() });

export const resumeReportSchema = z.object({
  is_resume: z.boolean(),
  invalid_reason: z.string().nullable(),
  candidate_name: z.string().nullable(),
  overall_score: z.number().int().min(0).max(100),
  ats_score: z.number().int().min(0).max(100),
  summary: z.string(),
  page_estimate: z.number().int().min(0).max(10),
  recommended_length: z.string(),
  categories: z.object({
    ats_compatibility: score, formatting: score, readability: score, section_structure: score, education: score, experience: score,
    skills: score, projects: score, achievements: score, grammar_spelling: score, keyword_relevance: score, measurable_impact: score,
  }),
  swot: z.object({ strengths: z.array(z.string()), weaknesses: z.array(z.string()), opportunities: z.array(z.string()), threats: z.array(z.string()) }),
  issues: z.array(issue),
  missing_information: z.array(z.string()),
  remove_content: z.array(z.object({ text: z.string(), reason: z.string() })),
  line_improvements: z.array(z.object({ section: z.string(), original: z.string(), improved: z.string(), why: z.string(), keywords: z.array(z.string()) })),
  keywords: z.array(z.object({ section: z.string(), keywords: z.array(z.string()), where_to_add: z.string() })),
  recommendations: z.array(z.string()),
  improved_resume: z.object({
    name: z.string(),
    contact: z.string(),
    headline: z.string(),
    summary: z.string(),
    sections: z.array(z.object({ title: z.string(), entries: z.array(z.object({ heading: z.string(), subheading: z.string(), dates: z.string(), bullets: z.array(z.string()) })) })),
    skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
  }),
});
export type ResumeReport = z.infer<typeof resumeReportSchema>;

export const CATEGORY_LABELS: Record<keyof ResumeReport["categories"], string> = {
  ats_compatibility: "ATS compatibility", formatting: "Formatting", readability: "Readability", section_structure: "Section structure",
  education: "Education", experience: "Experience", skills: "Skills", projects: "Projects", achievements: "Achievements",
  grammar_spelling: "Grammar & spelling", keyword_relevance: "Keyword relevance", measurable_impact: "Measurable achievements",
};

export const ANALYSIS_STAGES = ["Validating file", "Extracting resume content", "Analyzing experience & skills", "Checking ATS compatibility", "Identifying unnecessary points", "Evaluating keywords", "Generating SWOT analysis", "Building your ATS-friendly resume"];

export const RESUME_FILE_TYPES = /\.(pdf|docx?|png|jpe?g|webp)$/i;

/** One lifetime credit: used once an analysis is processing or completed; failed analyses don't consume it. */
export function resumeCreditsLeft(analyses: { status: string }[]) {
  return analyses.some((a) => a.status === "processing" || a.status === "completed") ? 0 : 1;
}
