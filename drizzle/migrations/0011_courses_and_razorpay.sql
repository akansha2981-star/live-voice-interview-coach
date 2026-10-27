CREATE TABLE public.courses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 actual_price numeric(10,2) NOT NULL CHECK (actual_price >= 0),
 final_price numeric(10,2) NOT NULL CHECK (final_price >= 1),
 credits integer NOT NULL CHECK (credits >= 0),
 description text,
 deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','disabled')),
 sort_order integer NOT NULL DEFAULT 0,
 created_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read live courses" ON public.courses FOR SELECT TO authenticated USING (status = 'live' OR public.is_staff(auth.uid()));
CREATE POLICY "Operators manage courses" ON public.courses FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));
ALTER TABLE public.course_purchases ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX course_purchases_order_id_key ON public.course_purchases(order_id) WHERE order_id IS NOT NULL;