import { sendTemplateEmail } from './email-templates/send-email';
import { COURSE_CONFIRMATION_TEMPLATE, PREBOOK_CONFIRMATION_TEMPLATE, paymentEmailData } from './payment-email-content';

type Db = (typeof import('@/integrations/supabase/client.server'))['supabaseAdmin'];
export type ConfirmationStatus = 'sent' | 'recipient_suppressed' | 'disabled' | 'pending';

/** Only called after the feature verifies payment; recipients always come from saved records. */
export async function sendPaymentConfirmation(db: Db, kind: 'course' | 'prebook', id: string): Promise<ConfirmationStatus> {
  const fallback = kind === 'course' ? COURSE_CONFIRMATION_TEMPLATE : PREBOOK_CONFIRMATION_TEMPLATE;
  try {
    const { data: edited, error: templateError } = await db.from('email_templates').select('*').eq('key', fallback.key).maybeSingle();
    if (templateError) throw templateError;
    const tpl = edited ?? fallback;
    if (!tpl.enabled) return 'disabled';
    let email: string | null;
    let values: Record<string, string | number | null>;
    if (kind === 'prebook') {
      const { data: booking, error } = await db.from('prebookings').select('id, name, email, amount, status, razorpay_order_id, razorpay_payment_id, paid_at').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!booking || booking.status !== 'paid' || !booking.paid_at || !booking.razorpay_payment_id) return 'pending';
      email = booking.email;
      values = { name: booking.name, email, amount: `₹${Number(booking.amount).toFixed(2)}`, booking_id: booking.id, order_id: booking.razorpay_order_id, payment_id: booking.razorpay_payment_id };
    } else {
      const { data: purchase, error } = await db.from('course_purchases').select('id, user_id, course_name, amount, currency, interview_credits, order_id, payment_status, email_sent_at').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!purchase || purchase.payment_status !== 'paid') return 'pending';
      if (purchase.email_sent_at) return 'sent';
      const { data: profile, error: profileError } = await db.from('profiles').select('email, full_name').eq('id', purchase.user_id).maybeSingle();
      if (profileError) throw profileError;
      email = profile?.email ?? null;
      values = { name: profile?.full_name || 'there', email, course: purchase.course_name, amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: purchase.currency || 'INR' }).format(Number(purchase.amount)), credits: purchase.interview_credits ?? 0, order_id: purchase.order_id };
    }
    if (!email) return 'pending';
    const result = await sendTemplateEmail(fallback.key, email, { idempotencyKey: `${fallback.key}-${id}`, templateData: paymentEmailData(tpl, values, kind === 'course' ? '/dashboard' : '/') });
    if (kind === 'course') await db.from('course_purchases').update({ email_sent_at: new Date().toISOString() }).eq('id', id);
    return result.sent ? 'sent' : 'recipient_suppressed';
  } catch (error) {
    // Payment stays successful even when email submission is unavailable. A repeated verified confirmation retries with the same key.
    console.error('Payment confirmation email failed', error instanceof Error ? error.message : 'Unknown error');
    return 'pending';
  }
}