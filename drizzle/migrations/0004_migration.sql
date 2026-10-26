CREATE TABLE public.answer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_index integer NOT NULL CHECK (question_index >= 0),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, interview_id, question_index)
);
GRANT SELECT, INSERT, DELETE ON public.answer_reviews TO authenticated;
GRANT ALL ON public.answer_reviews TO service_role;
ALTER TABLE public.answer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reviews read" ON public.answer_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own reviews insert" ON public.answer_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_id AND i.user_id = auth.uid()));
CREATE POLICY "Own reviews delete" ON public.answer_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.score_benchmark(_category text)
RETURNS TABLE(sample_size integer, scope text, avg_overall numeric, avg_resume numeric, avg_practical numeric, avg_general numeric, avg_communication numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer; sc text := 'category';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT count(*) INTO n FROM public.interviews WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid() AND category IS NOT DISTINCT FROM _category;
  IF n < 5 THEN
    sc := 'all';
    SELECT count(*) INTO n FROM public.interviews WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid();
  END IF;
  IF n < 5 THEN
    RETURN QUERY SELECT n, sc, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric; RETURN;
  END IF;
  RETURN QUERY SELECT n, sc,
    round(avg(overall_score)::numeric, 1),
    round(avg((report->'category_scores'->>'resume')::numeric), 1),
    round(avg((report->'category_scores'->>'practical')::numeric), 1),
    round(avg((report->'category_scores'->>'general_knowledge')::numeric), 1),
    round(avg((report->'scores'->'communication'->>'score')::numeric), 1)
  FROM public.interviews
  WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid() AND (sc = 'all' OR category IS NOT DISTINCT FROM _category);
END $$;
REVOKE EXECUTE ON FUNCTION public.score_benchmark(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.score_benchmark(text) TO authenticated;