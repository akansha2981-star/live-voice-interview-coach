ALTER TABLE public.college_training_docs DROP CONSTRAINT IF EXISTS college_training_docs_kind_check;
ALTER TABLE public.college_training_docs ADD CONSTRAINT college_training_docs_kind_check CHECK (kind IN ('training','case','sop_sample'));
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS sop_requirements text;
ALTER TABLE public.interview_settings ADD COLUMN IF NOT EXISTS sop_tat_minutes integer NOT NULL DEFAULT 60 CHECK (sop_tat_minutes BETWEEN 5 AND 1440);
CREATE TABLE public.sop_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  college_name text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  extracted_text text,
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review','completed','failed')),
  overall_score integer,
  report jsonb,
  samples_used integer NOT NULL DEFAULT 0,
  error text,
  expected_by timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX sop_reviews_user_idx ON public.sop_reviews(user_id, created_at DESC);
GRANT SELECT ON public.sop_reviews TO authenticated;
GRANT ALL ON public.sop_reviews TO service_role;
ALTER TABLE public.sop_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own SOP reviews" ON public.sop_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff read SOP reviews" ON public.sop_reviews FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Students upload own SOP files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sop-reviews' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students read own SOP files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sop-reviews' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));