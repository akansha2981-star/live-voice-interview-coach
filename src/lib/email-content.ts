// Browser-safe helpers shared by the email sender and the admin editor preview.
import { SITE_URL } from "@/lib/site";

export const EMAIL_SITE_URL = SITE_URL;

export const EMAIL_PLACEHOLDERS: Record<string, string[]> = {
  "slot-reminder-10": ["name", "slot_time", "college_line"],
  "slot-reminder-5": ["name", "slot_time", "college_line"],
  "interview-feedback": ["name", "score", "interview_date"],
  "resume-report": ["name", "file_name", "ats_score"],
  "sop-review": ["name", "score", "college_line"],
  "course-confirmation": ["name", "course", "amount", "credits", "order_id"],
};

/** Replaces {{key}} with values; unknown placeholders become empty text. */
export function fillPlaceholders(text: string, values: Record<string, string | number | null | undefined>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = values[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function formatIst(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** Which reminder (if any) is due for a slot right now. Late bookings skip reminders already in the past. */
export function dueReminder(startsAt: number, bookedAt: number, now: number): "10" | "5" | null {
  const mins = (startsAt - now) / 60000;
  if (mins > 5 && mins <= 10 && startsAt - bookedAt > 10 * 60000) return "10";
  if (mins > 0 && mins <= 5 && startsAt - bookedAt > 5 * 60000) return "5";
  return null;
}
