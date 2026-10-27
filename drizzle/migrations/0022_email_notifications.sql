CREATE TABLE public.email_templates (
  key text PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  heading text NOT NULL,
  body text NOT NULL,
  button_label text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
CREATE POLICY "staff read email templates" ON public.email_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators edit email templates" ON public.email_templates FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

INSERT INTO public.email_templates (key, name, subject, heading, body, button_label) VALUES
('slot-reminder-10', 'Slot reminder — 10 minutes before', 'Your MBA Compass interview starts in 10 minutes', 'Your interview starts in 10 minutes',
 E'Hi {{name}},\n\nYour mock interview{{college_line}} begins at {{slot_time}} (IST).\n\nPlease find a quiet, well-lit place, keep your camera and microphone ready, and use a stable internet connection.', 'Open my slots'),
('slot-reminder-5', 'Slot reminder — 5 minutes before', 'Starting in 5 minutes: your MBA Compass interview', 'Your interview starts in 5 minutes',
 E'Hi {{name}},\n\nYour mock interview{{college_line}} begins at {{slot_time}} (IST). Join now to complete the camera and microphone check before you start.', 'Join interview'),
('interview-feedback', 'Interview feedback with PDF report', 'Your interview feedback is ready — score {{score}}/100', 'Your detailed interview feedback',
 E'Hi {{name}},\n\nThank you for completing your interview on {{interview_date}}. Your overall score is {{score}}/100.\n\nOpen your report to read the full answer analysis, communication and body-language feedback, transcript and improvement plan, and download the detailed PDF.', 'View report and download PDF'),
('resume-report', 'Resume builder report', 'Your resume report and updated resume are ready', 'Your resume review is complete',
 E'Hi {{name}},\n\nWe have finished reviewing {{file_name}}. Your ATS score is {{ats_score}}/100.\n\nYour detailed report and the recreated, ATS-friendly resume are ready to view and download as Word or PDF.', 'View report and updated resume'),
('sop-review', 'SOP review complete', 'Your SOP review is ready — score {{score}}/100', 'Your SOP has been reviewed',
 E'Hi {{name}},\n\nYour SOP{{college_line}} has been reviewed. Your overall score is {{score}}/100.\n\nOpen the review to see line-by-line feedback and your improved SOP.', 'View SOP review'),
('course-confirmation', 'Course purchase confirmation', 'Purchase confirmed: {{course}}', 'Thank you for your purchase',
 E'Hi {{name}},\n\nYour payment of {{amount}} for {{course}} was successful.\n\n{{credits}} interview credits have been added to your account. Order reference: {{order_id}}.', 'Go to dashboard');

ALTER TABLE public.interview_bookings ADD COLUMN reminder_10_sent_at timestamptz, ADD COLUMN reminder_5_sent_at timestamptz;
ALTER TABLE public.interviews ADD COLUMN feedback_email_sent_at timestamptz;
ALTER TABLE public.resume_analyses ADD COLUMN email_sent_at timestamptz;
ALTER TABLE public.sop_reviews ADD COLUMN email_sent_at timestamptz;
ALTER TABLE public.course_purchases ADD COLUMN email_sent_at timestamptz;

-- Mark existing records as already handled so only new events send email.
UPDATE public.interview_bookings SET reminder_10_sent_at = now(), reminder_5_sent_at = now();
UPDATE public.interviews SET feedback_email_sent_at = now();
UPDATE public.resume_analyses SET email_sent_at = now();
UPDATE public.sop_reviews SET email_sent_at = now();
UPDATE public.course_purchases SET email_sent_at = now();