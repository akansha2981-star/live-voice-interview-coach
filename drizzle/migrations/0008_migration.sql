CREATE OR REPLACE FUNCTION public.admin_set_role(_email text, _role public.app_role, _grant boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only super admins can change roles'; END IF;
  IF _role = 'student' THEN RAISE EXCEPTION 'Student role cannot be changed here'; END IF;
  SELECT id INTO uid FROM public.profiles WHERE lower(email) = lower(trim(_email));
  IF uid IS NULL THEN RAISE EXCEPTION 'No user with that email'; END IF;
  IF NOT _grant AND uid = auth.uid() AND _role = 'admin' THEN RAISE EXCEPTION 'You cannot remove your own super admin role'; END IF;
  IF _grant THEN INSERT INTO public.user_roles(user_id, role) VALUES (uid, _role) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.user_roles WHERE user_id = uid AND role = _role; END IF;
  INSERT INTO public.audit_logs(actor_id, action, target_user, details) VALUES (auth.uid(), CASE WHEN _grant THEN 'role_granted' ELSE 'role_revoked' END, uid, jsonb_build_object('role', _role));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(text, public.app_role, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_role(text, public.app_role, boolean) TO authenticated;