-- Staff helpers
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operations_admin','support_agent','analyst'))
$$;
CREATE OR REPLACE FUNCTION public.can_operate(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operations_admin'))
$$;
CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operations_admin','support_agent'))
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Staff read access on existing tables
CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read interviews" ON public.interviews FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read bookings" ON public.interview_bookings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read ledger" ON public.credit_ledger FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read slots" ON public.interview_slots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_user uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.can_operate(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _target uuid, _details jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.audit_logs(actor_id, action, target_user, details) VALUES (auth.uid(), _action, _target, coalesce(_details,'{}'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_audit(text, uuid, jsonb) TO authenticated;

-- Transaction-safe credit adjustment
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(_user_id uuid, _delta integer, _reason text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev integer; nxt integer;
BEGIN
  IF NOT public.can_operate(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _delta = 0 OR abs(_delta) > 1000 THEN RAISE EXCEPTION 'Invalid credit change'; END IF;
  IF coalesce(length(trim(_reason)),0) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));
  SELECT coalesce(sum(delta),0) INTO prev FROM public.credit_ledger WHERE user_id = _user_id;
  nxt := prev + _delta;
  IF nxt < 0 THEN RAISE EXCEPTION 'Balance cannot go below zero'; END IF;
  INSERT INTO public.credit_ledger(user_id, delta, reason, created_by) VALUES (_user_id, _delta, trim(_reason), auth.uid());
  INSERT INTO public.audit_logs(actor_id, action, target_user, details) VALUES (auth.uid(), 'credit_adjustment', _user_id, jsonb_build_object('previous_balance', prev, 'change', _delta, 'new_balance', nxt, 'reason', trim(_reason)));
  RETURN nxt;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only super admins can change account status'; END IF;
  IF _status NOT IN ('active','suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.profiles SET account_status = _status, updated_at = now() WHERE id = _user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_user, details) VALUES (auth.uid(), 'account_status', _user_id, jsonb_build_object('status', _status));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text) TO authenticated;

-- Course purchases (integration-ready; no payment provider yet)
CREATE TABLE public.course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_name text NOT NULL,
  order_id text,
  amount numeric,
  currency text,
  payment_status text,
  source text NOT NULL DEFAULT 'manual',
  interview_credits integer NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read purchases" ON public.course_purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Operators record purchases" ON public.course_purchases FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()) AND created_by = auth.uid());

-- Slot staff management for operations admins
CREATE POLICY "Operators insert slots" ON public.interview_slots FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Operators update slots" ON public.interview_slots FOR UPDATE TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_cancel_booking(_booking_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.interview_bookings;
BEGIN
  IF NOT public.can_operate(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _status NOT IN ('cancelled','no_show') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.interview_bookings SET status = _status WHERE id = _booking_id AND status = 'booked' RETURNING * INTO b;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Only booked appointments can be changed'; END IF;
  INSERT INTO public.audit_logs(actor_id, action, target_user, details) VALUES (auth.uid(), 'booking_' || _status, b.user_id, jsonb_build_object('booking_id', b.id, 'slot_id', b.slot_id));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_booking(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_cancel_booking(uuid, text) TO authenticated;

-- Support tickets
CREATE SEQUENCE public.ticket_no_seq START 1001;
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no integer NOT NULL DEFAULT nextval('public.ticket_no_seq') UNIQUE,
  user_id uuid NOT NULL,
  category text NOT NULL,
  subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 200),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_student','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SEQUENCE public.ticket_no_seq TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Students open tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND assigned_to IS NULL AND priority = 'normal');
CREATE POLICY "Support updates tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.can_support(auth.uid())) WITH CHECK (public.can_support(auth.uid()));

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  internal boolean NOT NULL DEFAULT false,
  from_staff boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read ticket messages" ON public.ticket_messages FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR (NOT internal AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())));
CREATE POLICY "Student reply" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND NOT internal AND NOT from_staff AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status <> 'closed'));
CREATE POLICY "Staff reply" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND from_staff AND public.can_support(auth.uid()));

CREATE OR REPLACE FUNCTION public.ticket_touch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.from_staff AND NOT NEW.internal THEN
    UPDATE public.support_tickets SET updated_at = now(), status = CASE WHEN status IN ('open','in_progress') THEN 'waiting_student' ELSE status END WHERE id = NEW.ticket_id;
  ELSIF NOT NEW.from_staff THEN
    UPDATE public.support_tickets SET updated_at = now(), status = CASE WHEN status = 'waiting_student' THEN 'in_progress' ELSE status END WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ticket_messages_touch AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.ticket_touch();

CREATE OR REPLACE FUNCTION public.reopen_ticket(_ticket_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.support_tickets SET status = 'open', resolved_at = NULL, updated_at = now() WHERE id = _ticket_id AND user_id = auth.uid() AND status = 'resolved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only resolved tickets can be reopened'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.reopen_ticket(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reopen_ticket(uuid) TO authenticated;

-- Resources
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  instructions text,
  category text NOT NULL DEFAULT 'SOP',
  banner_path text,
  pdf_path text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read published resources" ON public.resources FOR SELECT TO authenticated USING (published OR public.is_staff(auth.uid()));
CREATE POLICY "Operators manage resources" ON public.resources FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE TABLE public.resource_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  resource_title text NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_downloads TO authenticated;
GRANT ALL ON public.resource_downloads TO service_role;
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read downloads" ON public.resource_downloads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Storage policies
CREATE POLICY "Banners readable" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = 'banners');
CREATE POLICY "Operators read resources" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resources' AND public.can_operate(auth.uid()));
CREATE POLICY "Operators upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources' AND public.can_operate(auth.uid()));
CREATE POLICY "Operators update resources" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resources' AND public.can_operate(auth.uid()));
CREATE POLICY "Operators delete resources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources' AND public.can_operate(auth.uid()));
CREATE POLICY "Own support uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own or staff support read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'support' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
CREATE POLICY "Staff support uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support' AND public.can_support(auth.uid()));
CREATE POLICY "Staff read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND public.can_operate(auth.uid()));

-- Admin metrics
CREATE OR REPLACE FUNCTION public.admin_metrics(_from timestamptz, _to timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE days numeric; r jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  days := greatest(1, ceil(extract(epoch FROM (_to - _from)) / 86400.0));
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at BETWEEN _from AND _to),
    'purchases', (SELECT count(*) FROM public.course_purchases WHERE purchased_at BETWEEN _from AND _to),
    'booked', (SELECT count(*) FROM public.interview_bookings WHERE created_at BETWEEN _from AND _to),
    'completed', (SELECT count(*) FROM public.interviews WHERE status = 'completed' AND started_at BETWEEN _from AND _to),
    'upcoming', (SELECT count(*) FROM public.interview_bookings b JOIN public.interview_slots s ON s.id = b.slot_id WHERE b.status = 'booked' AND s.ends_at > now()),
    'cancelled', (SELECT count(*) FROM public.interview_bookings WHERE status = 'cancelled' AND created_at BETWEEN _from AND _to),
    'no_show', (SELECT count(*) FROM public.interview_bookings b JOIN public.interview_slots s ON s.id = b.slot_id WHERE (b.status = 'no_show' OR (b.status = 'booked' AND s.ends_at < now())) AND b.created_at BETWEEN _from AND _to),
    'users_with_credits', (SELECT count(*) FROM (SELECT user_id FROM public.credit_ledger GROUP BY user_id HAVING sum(delta) > 0) x),
    'pending_tickets', (SELECT count(*) FROM public.support_tickets WHERE status IN ('open','in_progress','waiting_student')),
    'downloads', (SELECT count(*) FROM public.resource_downloads WHERE downloaded_at BETWEEN _from AND _to),
    'days', days,
    'daily', (SELECT coalesce(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
       SELECT jsonb_build_object('day', g::date, 
         'booked', (SELECT count(*) FROM public.interview_bookings WHERE created_at::date = g::date),
         'completed', (SELECT count(*) FROM public.interviews WHERE status = 'completed' AND started_at::date = g::date)) d
       FROM generate_series(_from::date, _to::date, interval '1 day') g) q)
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_metrics(timestamptz, timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_metrics(timestamptz, timestamptz) TO authenticated;