CREATE OR REPLACE FUNCTION public.can_read_resource_banner(_user_id uuid, _path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_staff(_user_id)
    OR (
      public.can_view_feed(_user_id) AND (
        EXISTS (SELECT 1 FROM public.resources r WHERE r.published AND r.banner_path = _path)
        OR EXISTS (SELECT 1 FROM public.announcements a WHERE a.image_path = _path)
      )
    )
  )
$$;

REVOKE ALL ON FUNCTION public.can_read_resource_banner(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_resource_banner(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Banners readable" ON storage.objects;

CREATE POLICY "Banners readable"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = 'banners'
  AND public.can_read_resource_banner((select auth.uid()), name)
);