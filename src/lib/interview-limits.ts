export function interviewDeadline(startedAt: string, durationSeconds: number, snapshot: string | null) {
  const explicit = snapshot ? Date.parse(snapshot) : NaN;
  return Number.isFinite(explicit) ? explicit : Date.parse(startedAt) + durationSeconds * 1000;
}
export function remainingInterviewMs(deadline: number, now = Date.now()) { return Math.max(0, deadline - now); }
export function validQuestionBudget(durationMinutes: number, count: number, min: number, max: number) {
  return [durationMinutes, count, min, max].every(Number.isInteger) && durationMinutes >= 5 && durationMinutes <= 60 && count >= 3 && count <= 30 && min >= 10 && min <= 300 && max >= 20 && max <= 600 && max >= min && count * min + 15 <= durationMinutes * 60;
}