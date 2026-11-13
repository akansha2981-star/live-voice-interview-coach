CREATE OR REPLACE FUNCTION public.can_annotate_resource(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND public.can_view_feed(_user_id)
    AND EXISTS (SELECT 1 FROM public.resources r WHERE r.id = _resource_id AND r.published AND r.pdf_path IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.can_annotate_resource(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_annotate_resource(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.resource_notes (
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id),
  CONSTRAINT resource_notes_body_len CHECK (char_length(body) <= 20000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_notes TO authenticated;
GRANT ALL ON public.resource_notes TO service_role;
ALTER TABLE public.resource_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notes read" ON public.resource_notes FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Own notes insert" ON public.resource_notes FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id AND public.can_annotate_resource((select auth.uid()), resource_id));
CREATE POLICY "Own notes update" ON public.resource_notes FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id AND public.can_annotate_resource((select auth.uid()), resource_id));
CREATE POLICY "Own notes delete" ON public.resource_notes FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE public.resource_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  page integer NOT NULL,
  x double precision NOT NULL,
  y double precision NOT NULL,
  w double precision NOT NULL,
  h double precision NOT NULL,
  color text NOT NULL DEFAULT 'amber',
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resource_highlights_page CHECK (page BETWEEN 1 AND 5000),
  CONSTRAINT resource_highlights_box CHECK (x >= 0 AND y >= 0 AND w > 0 AND h > 0 AND x + w <= 1.0001 AND y + h <= 1.0001),
  CONSTRAINT resource_highlights_color CHECK (color IN ('amber', 'sky', 'rose')),
  CONSTRAINT resource_highlights_label_len CHECK (char_length(label) <= 300)
);
CREATE INDEX resource_highlights_owner_idx ON public.resource_highlights (user_id, resource_id, page);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_highlights TO authenticated;
GRANT ALL ON public.resource_highlights TO service_role;
ALTER TABLE public.resource_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own marks read" ON public.resource_highlights FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Own marks insert" ON public.resource_highlights FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id AND public.can_annotate_resource((select auth.uid()), resource_id));
CREATE POLICY "Own marks update" ON public.resource_highlights FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id AND public.can_annotate_resource((select auth.uid()), resource_id));
CREATE POLICY "Own marks delete" ON public.resource_highlights FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);