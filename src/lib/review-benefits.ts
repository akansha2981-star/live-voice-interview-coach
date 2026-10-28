export type FreeSopSlot = "general" | "nmims";
export function freeSopAllowance(reviews: { status: string; free_credit_slot?: string | null }[]) {
  const used = reviews.filter(review => review.status === "completed" || review.status === "under_review");
  const general = used.some(review => review.free_credit_slot === "general") ? 0 : 1;
  const nmims = used.some(review => review.free_credit_slot === "nmims") ? 0 : 1;
  return { general, nmims, total: general + nmims };
}
export function availableSopSlot(allowance: ReturnType<typeof freeSopAllowance>, collegeName: string): FreeSopSlot | null {
  if (/nmims|narsee monjee/i.test(collegeName) && allowance.nmims) return "nmims";
  return allowance.general ? "general" : null;
}