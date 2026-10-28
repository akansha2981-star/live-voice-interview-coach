// Server-only: finds due notification events and sends each once, using admin-edited templates.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { EMAIL_SITE_URL, dueReminder, fillPlaceholders, formatIst } from "@/lib/email-content";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
type Tpl = { key: string; subject: string; heading: string; body: string; button_label: string; enabled: boolean };

const DAY = 86400000;

export async function runEmailAlerts() {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: tpls } = await db.from("email_templates").select("*");
  const templates = new Map<string, Tpl>((tpls ?? []).map((t) => [t.key, t as Tpl]));
  const now = Date.now();
  const results: Record<string, number> = {};
  const profileCache = new Map<string, { email: string | null; name: string }>();

  async function profile(userId: string) {
    if (!profileCache.has(userId)) {
      const { data } = await db.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
      profileCache.set(userId, { email: data?.email ?? null, name: data?.full_name?.split(" ")[0] || "there" });
    }
    return profileCache.get(userId) ?? { email: null, name: 'there' };
  }

  /** Atomically claims the event, sends it, and releases the claim if sending fails so it retries next run. */
  async function deliver(table: string, column: string, id: string, key: string, userId: string, values: Record<string, string | number | null>, path: string) {
    const tpl = templates.get(key);
    const p = await profile(userId);
    const claim = await (db.from(table as never) as any).update({ [column]: new Date().toISOString() }).eq("id", id).is(column, null).select("id");
    if (!claim.data?.length) return;
    if (!tpl?.enabled || !p.email) return; // disabled or no address: mark handled, send nothing
    const v = { name: p.name, email: p.email, dashboard_url: `${EMAIL_SITE_URL}/dashboard`, ...values };
    try {
      await sendTemplateEmail(key, p.email, {
        idempotencyKey: `${key}-${id}`,
        templateData: { subject: fillPlaceholders(tpl.subject, v), heading: fillPlaceholders(tpl.heading, v), body: fillPlaceholders(tpl.body, v), buttonLabel: tpl.button_label, buttonUrl: `${EMAIL_SITE_URL}${path}` },
      });
      results[key] = (results[key] ?? 0) + 1;
    } catch (e) {
      console.error(`email ${key} ${id} failed`, e);
      await (db.from(table as never) as any).update({ [column]: null }).eq("id", id);
    }
  }

  // Slot reminders
  const { data: bookings } = await db.from("interview_bookings")
    .select("id, user_id, created_at, college_name, practice_only, reminder_10_sent_at, reminder_5_sent_at, interview_slots!inner(starts_at)")
    .eq("status", "booked")
    .gt("interview_slots.starts_at", new Date(now).toISOString())
    .lte("interview_slots.starts_at", new Date(now + 10 * 60000).toISOString());
  for (const b of bookings ?? []) {
    const startsAt = (b.interview_slots as unknown as { starts_at: string }).starts_at;
    const due = dueReminder(Date.parse(startsAt), Date.parse(b.created_at), now);
    if (!due) continue;
    const column = due === "10" ? "reminder_10_sent_at" : "reminder_5_sent_at";
    if (b[column]) continue;
    const college_line = !b.practice_only && b.college_name ? ` for ${b.college_name}` : "";
    await deliver("interview_bookings", column, b.id, `slot-reminder-${due}`, b.user_id, { slot_time: formatIst(startsAt), college_line }, "/my-slots");
  }

  // Interview feedback, 10 minutes after completion
  const { data: interviews } = await db.from("interviews").select("id, user_id, ended_at, overall_score")
    .eq("status", "completed").not("report", "is", null).is("feedback_email_sent_at", null)
    .lte("ended_at", new Date(now - 10 * 60000).toISOString()).gte("ended_at", new Date(now - 2 * DAY).toISOString());
  for (const i of interviews ?? []) {
    await deliver("interviews", "feedback_email_sent_at", i.id, "interview-feedback", i.user_id, { score: i.overall_score ?? "—", interview_date: i.ended_at ? formatIst(i.ended_at) : "" }, `/report/${i.id}`);
  }

  // Resume reports
  const { data: resumes } = await db.from("resume_analyses").select("id, user_id, file_name, ats_score")
    .eq("status", "completed").is("email_sent_at", null).gte("completed_at", new Date(now - 2 * DAY).toISOString());
  for (const r of resumes ?? []) {
    await deliver("resume_analyses", "email_sent_at", r.id, "resume-report", r.user_id, { file_name: r.file_name || "your resume", ats_score: r.ats_score ?? "—" }, "/resume-builder");
  }

  // SOP reviews
  const { data: sops } = await db.from("sop_reviews").select("id, user_id, college_name, overall_score")
    .eq("status", "completed").is("email_sent_at", null).gte("completed_at", new Date(now - 2 * DAY).toISOString());
  for (const s of sops ?? []) {
    await deliver("sop_reviews", "email_sent_at", s.id, "sop-review", s.user_id, { score: s.overall_score ?? "—", college_line: s.college_name ? ` for ${s.college_name}` : "" }, "/sop-review");
  }

  // Course purchases
  const { sendPaymentConfirmation } = await import('./payment-emails.server');
  const { data: purchases } = await db.from("course_purchases").select("id")
    .eq("payment_status", "paid").is("email_sent_at", null).order('created_at').limit(100);
  for (const c of purchases ?? []) {
    const status = await sendPaymentConfirmation(db, 'course', c.id);
    if (status === 'sent') results['course-confirmation'] = (results['course-confirmation'] ?? 0) + 1;
    if (status === 'pending') break;
  }

  return results;
}

export type { Admin };
