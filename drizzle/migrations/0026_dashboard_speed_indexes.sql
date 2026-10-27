CREATE INDEX IF NOT EXISTS interview_bookings_user_created_idx ON public.interview_bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS interviews_user_status_started_idx ON public.interviews (user_id, status, started_at);
CREATE INDEX IF NOT EXISTS answer_reviews_user_idx ON public.answer_reviews (user_id);