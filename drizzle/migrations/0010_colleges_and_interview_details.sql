CREATE TABLE public.colleges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colleges TO authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read colleges" ON public.colleges FOR SELECT TO authenticated USING (active OR public.is_staff(auth.uid()));
CREATE POLICY "Operators manage colleges" ON public.colleges FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));
ALTER TABLE public.interview_bookings ADD COLUMN college_id uuid REFERENCES public.colleges(id), ADD COLUMN college_name text, ADD COLUMN practice_only boolean NOT NULL DEFAULT false, ADD COLUMN actual_interview_at timestamptz, ADD COLUMN call_letter_path text;
CREATE POLICY "Own call letter upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'call-letters' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own or staff read call letter" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'call-letters' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));