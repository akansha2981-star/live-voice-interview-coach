CREATE TABLE public.college_training_docs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
 kind text NOT NULL DEFAULT 'training' CHECK (kind IN ('training','case')),
 title text NOT NULL,
 file_path text NOT NULL,
 mime_type text,
 status text NOT NULL DEFAULT 'reading' CHECK (status IN ('reading','saved','failed')),
 knowledge jsonb,
 error text,
 created_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.college_training_docs TO authenticated;
GRANT ALL ON public.college_training_docs TO service_role;
ALTER TABLE public.college_training_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read training docs" ON public.college_training_docs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Operators add training docs" ON public.college_training_docs FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()) AND created_by = auth.uid() AND status = 'reading' AND knowledge IS NULL);
CREATE POLICY "Operators delete training docs" ON public.college_training_docs FOR DELETE TO authenticated USING (public.can_operate(auth.uid()));
CREATE TABLE public.interview_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 duration_minutes integer NOT NULL DEFAULT 20 CHECK (duration_minutes BETWEEN 5 AND 90),
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.interview_settings (id) VALUES (1);
GRANT SELECT, UPDATE ON public.interview_settings TO authenticated;
GRANT ALL ON public.interview_settings TO service_role;
ALTER TABLE public.interview_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read interview settings" ON public.interview_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators update settings" ON public.interview_settings FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));
CREATE POLICY "Staff upload training files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'college-training' AND public.can_operate(auth.uid()));
CREATE POLICY "Staff read training files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'college-training' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete training files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'college-training' AND public.can_operate(auth.uid()));