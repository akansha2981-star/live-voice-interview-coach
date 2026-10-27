CREATE OR REPLACE FUNCTION public.can_view_feed(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_staff(_user_id) OR (
      public.has_role(_user_id, 'student')
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.account_status = 'active')
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_feed(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_feed(uuid) TO authenticated;

DROP POLICY "Read announcements" ON public.announcements;
CREATE POLICY "Active members read announcements" ON public.announcements FOR SELECT TO authenticated USING (public.can_view_feed(auth.uid()));

DROP POLICY "Read comments" ON public.announcement_comments;
CREATE POLICY "Active members read comments" ON public.announcement_comments FOR SELECT TO authenticated USING (public.can_view_feed(auth.uid()));