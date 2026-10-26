CREATE TABLE public.interview_slots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0 AND capacity <= 100), published boolean NOT NULL DEFAULT true, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at > starts_at));
GRANT SELECT, INSERT, UPDATE ON public.interview_slots TO authenticated;
GRANT ALL ON public.interview_slots TO service_role;
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published slots and admin read" ON public.interview_slots FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin publish slots" ON public.interview_slots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admin update slots" ON public.interview_slots FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.interview_bookings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, slot_id uuid NOT NULL REFERENCES public.interview_slots(id), status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','started','cancelled')), interview_id uuid REFERENCES public.interviews(id), checked_at timestamptz, preflight jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.interview_bookings TO authenticated;
GRANT ALL ON public.interview_bookings TO service_role;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookings read" ON public.interview_bookings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX one_booking_per_slot ON public.interview_bookings(user_id,slot_id) WHERE status <> 'cancelled';
CREATE FUNCTION public.book_interview_slot(_slot_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.interview_slots; n integer; bal integer; bid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));
 SELECT * INTO s FROM public.interview_slots WHERE id = _slot_id FOR UPDATE;
 IF s.id IS NULL OR NOT s.published OR s.starts_at <= now() THEN RAISE EXCEPTION 'This slot is no longer available'; END IF;
 SELECT count(*) INTO n FROM public.interview_bookings WHERE slot_id = s.id AND status <> 'cancelled';
 IF n >= s.capacity THEN RAISE EXCEPTION 'This slot is fully booked'; END IF;
 IF EXISTS (SELECT 1 FROM public.interview_bookings b JOIN public.interview_slots other ON other.id = b.slot_id WHERE b.user_id = uid AND b.status = 'booked' AND other.starts_at < s.ends_at AND other.ends_at > s.starts_at) THEN RAISE EXCEPTION 'You already have an interview at this time'; END IF;
 SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE user_id = uid;
 SELECT count(*) INTO n FROM public.interview_bookings b JOIN public.interview_slots sl ON sl.id = b.slot_id WHERE b.user_id = uid AND b.status = 'booked' AND sl.ends_at > now();
 IF bal <= n THEN RAISE EXCEPTION 'No unreserved interview credits left'; END IF;
 INSERT INTO public.interview_bookings(user_id,slot_id) VALUES (uid,s.id) RETURNING id INTO bid;
 RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.book_interview_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(uuid) TO authenticated;
CREATE FUNCTION public.cancel_interview_booking(_booking_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 UPDATE public.interview_bookings SET status = 'cancelled' WHERE id = _booking_id AND user_id = auth.uid() AND status = 'booked';
 IF NOT FOUND THEN RAISE EXCEPTION 'Booking cannot be cancelled'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.cancel_interview_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_interview_booking(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.start_interview() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); bal integer; iid uuid; p public.profiles; b public.interview_bookings;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));
 SELECT bookings.* INTO b FROM public.interview_bookings bookings JOIN public.interview_slots sl ON sl.id = bookings.slot_id WHERE bookings.user_id = uid AND bookings.status = 'booked' AND sl.starts_at <= now() AND sl.ends_at > now() AND bookings.checked_at > now() - interval '10 minutes' ORDER BY sl.starts_at LIMIT 1 FOR UPDATE OF bookings;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Book a slot and complete equipment checks during your scheduled time first'; END IF;
 SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE user_id = uid;
 IF bal < 1 THEN RAISE EXCEPTION 'No interview credits left'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id = uid;
 INSERT INTO public.interviews(user_id,category,difficulty) VALUES (uid,p.interview_category,p.difficulty) RETURNING id INTO iid;
 INSERT INTO public.credit_ledger(user_id,delta,reason,interview_id) VALUES (uid,-1,'Interview started',iid);
 UPDATE public.interview_bookings SET status = 'started', interview_id = iid WHERE id = b.id;
 RETURN iid;
END $$;