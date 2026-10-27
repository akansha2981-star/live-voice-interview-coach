/** Interview time split: 20% resume, 50% college intelligence, 30% case-based. */
export const SECTION_SHARE = { resume: 0.2, college: 0.5, case: 0.3 } as const;

export function sectionMinutes(total: number) {
  const resume = Math.round(total * SECTION_SHARE.resume * 10) / 10;
  const kase = Math.round(total * SECTION_SHARE.case * 10) / 10;
  const college = Math.round((total - resume - kase) * 10) / 10;
  return { resume, college, case: kase };
}
