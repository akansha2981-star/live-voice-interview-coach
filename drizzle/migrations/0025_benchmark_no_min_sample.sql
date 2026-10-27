CREATE OR REPLACE FUNCTION public.score_benchmark(_category text)
RETURNS TABLE(sample_size integer, scope text, avg_overall numeric, avg_resume numeric, avg_practical numeric, avg_general numeric, avg_communication numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer; sc text := 'category';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT count(*) INTO n FROM public.interviews WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid() AND category IS NOT DISTINCT FROM _category;
  IF n = 0 THEN
    sc := 'all';
    SELECT count(*) INTO n FROM public.interviews WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid();
  END IF;
  IF n = 0 THEN
    RETURN QUERY SELECT n, sc, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric; RETURN;
  END IF;
  RETURN QUERY SELECT n, sc,
    round(avg(overall_score)::numeric, 1),
    round(avg((report->'category_scores'->>'resume')::numeric), 1),
    round((avg((report->'category_scores'->>'practical')::numeric) FILTER (WHERE report->'category_scores'->>'practical' IS NOT NULL))::numeric, 1),
    round((avg((report->'category_scores'->>'general_knowledge')::numeric) FILTER (WHERE report->'category_scores'->>'general_knowledge' IS NOT NULL))::numeric, 1),
    round((avg((report->'scores'->'communication'->>'score')::numeric) FILTER (WHERE report->'scores'->'communication'->>'score' IS NOT NULL))::numeric, 1)
  FROM public.interviews
  WHERE status = 'completed' AND overall_score IS NOT NULL AND user_id <> auth.uid() AND (sc = 'all' OR category IS NOT DISTINCT FROM _category);
END $function$;