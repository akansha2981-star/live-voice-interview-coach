CREATE TABLE public.gk_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  mark text,
  color text NOT NULL DEFAULT 'primary',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gk_categories TO authenticated;
GRANT ALL ON public.gk_categories TO service_role;
ALTER TABLE public.gk_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed readers see active categories" ON public.gk_categories FOR SELECT TO authenticated USING ((is_active AND public.can_view_feed(auth.uid())) OR public.is_staff(auth.uid()));
CREATE POLICY "Operators manage categories" ON public.gk_categories FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE TABLE public.gk_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid REFERENCES public.gk_categories(id) ON DELETE RESTRICT,
  subcategory text,
  cover_image text,
  summary_english text NOT NULL DEFAULT '',
  summary_hindi text NOT NULL DEFAULT '',
  summary_hinglish text NOT NULL DEFAULT '',
  detailed_content text NOT NULL DEFAULT '',
  why_this_matters text NOT NULL DEFAULT '',
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  author text,
  tags text[] NOT NULL DEFAULT '{}',
  article_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);
CREATE INDEX gk_articles_visible_idx ON public.gk_articles (status, published_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gk_articles TO authenticated;
GRANT ALL ON public.gk_articles TO service_role;
ALTER TABLE public.gk_articles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gk_is_live(_status text, _scheduled timestamptz) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT _status = 'published' OR (_status = 'scheduled' AND _scheduled <= now())
$$;

CREATE POLICY "Feed readers see live articles" ON public.gk_articles FOR SELECT TO authenticated USING ((public.gk_is_live(status, scheduled_at) AND public.can_view_feed(auth.uid())) OR public.is_staff(auth.uid()));
CREATE POLICY "Operators manage articles" ON public.gk_articles FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE OR REPLACE FUNCTION public.gk_article_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  IF NEW.status = 'scheduled' THEN NEW.published_at := NEW.scheduled_at; END IF;
  IF NEW.status = 'draft' THEN NEW.published_at := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gk_article_stamp BEFORE INSERT OR UPDATE ON public.gk_articles FOR EACH ROW EXECUTE FUNCTION public.gk_article_stamp();

CREATE TABLE public.gk_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  article_id uuid NOT NULL REFERENCES public.gk_articles(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  is_saved boolean NOT NULL DEFAULT false,
  saved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gk_user_progress TO authenticated;
GRANT ALL ON public.gk_user_progress TO service_role;
ALTER TABLE public.gk_user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress read" ON public.gk_user_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own progress insert" ON public.gk_user_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_feed(auth.uid()));
CREATE POLICY "Own progress update" ON public.gk_user_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.gk_article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  article_id uuid NOT NULL REFERENCES public.gk_articles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gk_article_views_article_idx ON public.gk_article_views (article_id);
GRANT SELECT, INSERT ON public.gk_article_views TO authenticated;
GRANT ALL ON public.gk_article_views TO service_role;
ALTER TABLE public.gk_article_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own views insert" ON public.gk_article_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_feed(auth.uid()));
CREATE POLICY "Staff read views" ON public.gk_article_views FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

ALTER TABLE public.profiles ADD COLUMN gk_language text NOT NULL DEFAULT 'en' CHECK (gk_language IN ('en','hi','hinglish'));

CREATE OR REPLACE FUNCTION public.gk_analytics() RETURNS TABLE(article_id uuid, views bigint, unique_readers bigint, completions bigint, bookmarks bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT a.id,
    (SELECT count(*) FROM gk_article_views v WHERE v.article_id = a.id),
    (SELECT count(DISTINCT v.user_id) FROM gk_article_views v WHERE v.article_id = a.id),
    (SELECT count(*) FROM gk_user_progress p WHERE p.article_id = a.id AND p.is_read),
    (SELECT count(*) FROM gk_user_progress p WHERE p.article_id = a.id AND p.is_saved)
  FROM gk_articles a;
END $$;
REVOKE ALL ON FUNCTION public.gk_analytics() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gk_analytics() TO authenticated;