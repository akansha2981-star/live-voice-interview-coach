import { EMAIL_SITE_URL, fillPlaceholders } from './email-content';

export const PREBOOK_CONFIRMATION_TEMPLATE = {
  key: 'prebook-confirmation', name: '₹1 prebooking confirmation',
  subject: 'Your MBA Compass prebooking is confirmed',
  heading: 'Your early-bird spot is reserved',
  body: 'Hi {{name}},\n\nWe have received your {{amount}} payment and reserved your MBA Compass early-bird spot.\n\nEmail: {{email}}\nBooking reference: {{booking_id}}\nPayment reference: {{payment_id}}\n\nOfficially launching on 29th November 2026. This prebooking reserves a spot only; it does not create an account or include interview credits.',
  button_label: 'Visit MBA Compass', enabled: true,
};

export const COURSE_CONFIRMATION_TEMPLATE = {
  key: 'course-confirmation', name: 'Course confirmation', subject: 'Your MBA Compass payment is confirmed',
  heading: 'Thank you for your purchase',
  body: 'Hi {{name}},\n\nYour {{amount}} payment for {{course}} is confirmed.\n\nInterview credits: {{credits}}\nOrder reference: {{order_id}}\nSign-in email: {{email}}\n\nOpen your dashboard using your existing sign-in details.',
  button_label: 'Go to dashboard', enabled: true,
};

export function paymentEmailData(tpl: { subject: string; heading: string; body: string; button_label: string }, values: Record<string, string | number | null>, path: string) {
  const fields = { dashboard_url: `${EMAIL_SITE_URL}/dashboard`, ...values };
  return { subject: fillPlaceholders(tpl.subject, fields), heading: fillPlaceholders(tpl.heading, fields), body: fillPlaceholders(tpl.body, fields), buttonLabel: tpl.button_label, buttonUrl: `${EMAIL_SITE_URL}${path}` };
}