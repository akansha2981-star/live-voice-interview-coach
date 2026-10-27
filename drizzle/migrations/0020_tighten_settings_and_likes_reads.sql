DROP POLICY "Read interview settings" ON public.interview_settings;
CREATE POLICY "Staff read interview settings" ON public.interview_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY "Read likes" ON public.announcement_likes;
CREATE POLICY "Own or staff read likes" ON public.announcement_likes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.announcement_like_counts(_ids uuid[])
RETURNS TABLE(announcement_id uuid, likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.announcement_id, count(*) FROM public.announcement_likes l
  WHERE auth.uid() IS NOT NULL AND l.announcement_id = ANY(_ids)
  GROUP BY l.announcement_id
$$;
REVOKE EXECUTE ON FUNCTION public.announcement_like_counts(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.announcement_like_counts(uuid[]) TO authenticated;