ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS event_at timestamptz;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS registration_url text;

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text,
  image_path text,
  link_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators post announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Operators edit announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));
CREATE POLICY "Operators delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.can_operate(auth.uid()));

CREATE TABLE public.announcement_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_likes TO authenticated;
GRANT ALL ON public.announcement_likes TO service_role;
ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read likes" ON public.announcement_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own like" ON public.announcement_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own unlike" ON public.announcement_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Student',
  from_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read comments" ON public.announcement_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own comment" ON public.announcement_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND length(btrim(body)) BETWEEN 1 AND 1000);
CREATE POLICY "Own or staff delete comment" ON public.announcement_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.can_operate(auth.uid()));

CREATE OR REPLACE FUNCTION public.comment_author_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.author_name := COALESCE(NULLIF(btrim((SELECT full_name FROM public.profiles WHERE id = NEW.user_id)), ''), 'Student');
  NEW.from_staff := public.is_staff(NEW.user_id);
  NEW.body := btrim(NEW.body);
  RETURN NEW;
END $$;
CREATE TRIGGER announcement_comment_author BEFORE INSERT ON public.announcement_comments FOR EACH ROW EXECUTE FUNCTION public.comment_author_stamp();
CREATE INDEX ON public.announcement_comments (announcement_id, created_at);
CREATE INDEX ON public.announcement_likes (announcement_id);