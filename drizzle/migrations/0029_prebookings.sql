CREATE TABLE public.prebookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  otp_sent_count integer NOT NULL DEFAULT 0,
  last_otp_sent_at timestamptz,
  phone_verified_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  amount numeric,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prebookings TO authenticated;
GRANT ALL ON public.prebookings TO service_role;
ALTER TABLE public.prebookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view prebookings" ON public.prebookings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX prebookings_phone_idx ON public.prebookings (phone, created_at DESC);