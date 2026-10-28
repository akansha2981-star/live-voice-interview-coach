CREATE TABLE public.prelaunch_dashboard_access (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prelaunch_dashboard_access TO authenticated;
GRANT ALL ON public.prelaunch_dashboard_access TO service_role;
ALTER TABLE public.prelaunch_dashboard_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own dashboard exception" ON public.prelaunch_dashboard_access FOR SELECT TO authenticated USING (user_id = auth.uid());
COMMENT ON TABLE public.prelaunch_dashboard_access IS 'Dashboard-only prelaunch exceptions. No admin privileges. Written only by privileged operators.';