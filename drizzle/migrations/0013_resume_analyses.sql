CREATE TABLE public.resume_analyses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 file_path text NOT NULL,
 file_name text NOT NULL,
 mime_type text,
 status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
 error text,
 extracted_text text,
 ats_score integer,
 report jsonb,
 improved_resume jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE UNIQUE INDEX resume_analyses_one_credit ON public.resume_analyses(user_id) WHERE status IN ('processing','completed');
CREATE INDEX resume_analyses_user ON public.resume_analyses(user_id, created_at DESC);
GRANT SELECT ON public.resume_analyses TO authenticated;
GRANT ALL ON public.resume_analyses TO service_role;
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read resume analyses" ON public.resume_analyses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own resume analysis upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resume-analyses' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own or staff read resume analysis file" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resume-analyses' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));