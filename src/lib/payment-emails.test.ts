import { beforeEach, describe, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('./email-templates/send-email', () => ({ sendTemplateEmail: send }));
import { sendPaymentConfirmation } from './payment-emails.server';

function database(kind: 'course' | 'prebook', paid = true) {
  const rows: Record<string, any> = {
    email_templates: null,
    prebookings: { id: 'booking-1', name: 'Asha', email: 'asha@example.com', amount: 1, status: paid ? 'paid' : 'pending', paid_at: paid ? '2026-10-28' : null, razorpay_order_id: 'order-1', razorpay_payment_id: 'pay-1' },
    course_purchases: { id: 'purchase-1', user_id: 'student-1', course_name: 'Mock interview', amount: 99, currency: 'INR', interview_credits: 1, order_id: 'order-2', payment_status: paid ? 'paid' : 'pending', email_sent_at: null },
    profiles: { email: 'asha@example.com', full_name: 'Asha' },
  };
  const db = { from: (table: string) => {
    let patch: any;
    const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: rows[table], error: null }), update: (value: any) => { patch = value; return query; }, then: (resolve: any) => { if (patch) Object.assign(rows[table], patch); return Promise.resolve({ error: null }).then(resolve); } };
    return query;
  } };
  return { db: db as unknown as Parameters<typeof sendPaymentConfirmation>[0], rows, id: kind === 'course' ? 'purchase-1' : 'booking-1' };
}

beforeEach(() => { send.mockReset(); send.mockResolvedValue({ sent: true }); });
describe('verified payment confirmation', () => {
  it('sends a ₹1 prebooking confirmation to the saved email', async () => {
    const { db, id } = database('prebook');
    expect(await sendPaymentConfirmation(db, 'prebook', id)).toBe('sent');
    expect(send).toHaveBeenCalledWith('prebook-confirmation', 'asha@example.com', expect.objectContaining({ idempotencyKey: 'prebook-confirmation-booking-1', templateData: expect.objectContaining({ buttonUrl: 'https://mbacompass.online/', body: expect.stringContaining('₹1.00') }) }));
  });
  it('sends course payments with a dashboard link and marks accepted sends', async () => {
    const { db, id, rows } = database('course');
    await sendPaymentConfirmation(db, 'course', id);
    expect(send).toHaveBeenCalledWith('course-confirmation', 'asha@example.com', expect.objectContaining({ templateData: expect.objectContaining({ buttonUrl: 'https://mbacompass.online/dashboard' }) }));
    expect(rows.course_purchases.email_sent_at).toBeTruthy();
    await sendPaymentConfirmation(db, 'course', id);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(['prebook', 'course'] as const)('never sends for unpaid %s', async kind => {
    const { db, id } = database(kind, false);
    expect(await sendPaymentConfirmation(db, kind, id)).toBe('pending');
    expect(send).not.toHaveBeenCalled();
  });
  it('repeated prebook confirmations use the same managed deduplication key', async () => {
    const { db, id, rows } = database('prebook');
    await sendPaymentConfirmation(db, 'prebook', id);
    await sendPaymentConfirmation(db, 'prebook', id);
    expect(send.mock.calls.map(call => call[2].idempotencyKey)).toEqual(['prebook-confirmation-booking-1', 'prebook-confirmation-booking-1']);
    expect(rows.prebookings.paid_at).toBe('2026-10-28');
  });
  it('email failure does not reverse payment and remains retryable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, id, rows } = database('course');
    send.mockRejectedValueOnce(new Error('Unavailable'));
    expect(await sendPaymentConfirmation(db, 'course', id)).toBe('pending');
    expect(rows.course_purchases.payment_status).toBe('paid');
    expect(rows.course_purchases.email_sent_at).toBeNull();
    expect(await sendPaymentConfirmation(db, 'course', id)).toBe('sent');
    vi.restoreAllMocks();
  });
  it('respects recipient suppression without retrying around it', async () => {
    const { db, id, rows } = database('course');
    send.mockResolvedValue({ sent: false, reason: 'recipient_suppressed' });
    expect(await sendPaymentConfirmation(db, 'course', id)).toBe('recipient_suppressed');
    expect(rows.course_purchases.email_sent_at).toBeTruthy();
  });
  it('uses admin edited wording', async () => {
    const { db, id, rows } = database('prebook');
    rows.email_templates = { subject: 'Reserved {{name}}', heading: 'Confirmed', body: 'Received {{amount}}', button_label: 'Visit', enabled: true };
    await sendPaymentConfirmation(db, 'prebook', id);
    expect(send.mock.calls[0][2].templateData.subject).toBe('Reserved Asha');
  });
});