GRANT SELECT (id, name, actual_price, final_price, credits, description, deliverables, status, sort_order) ON public.courses TO anon;
CREATE POLICY "Public live course catalog" ON public.courses FOR SELECT TO anon USING (status = 'live');
CREATE OR REPLACE FUNCTION public.public_course_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'actual_price', actual_price, 'final_price', final_price, 'credits', credits, 'description', description, 'deliverables', deliverables) ORDER BY sort_order, final_price), '[]'::jsonb) FROM public.courses WHERE status = 'live';
$$;
REVOKE ALL ON FUNCTION public.public_course_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_course_catalog() TO anon, authenticated, service_role;