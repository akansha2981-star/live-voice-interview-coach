CREATE OR REPLACE FUNCTION public.book_interview_now(_practice boolean, _college uuid, _actual_at timestamp with time zone, _letter text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); cname text; bid uuid; sid uuid; bal integer; n integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF _practice IS NULL THEN RAISE EXCEPTION 'Choose interview type'; END IF;
 IF NOT _practice THEN
  SELECT name INTO cname FROM public.colleges WHERE id=_college AND active;
  IF cname IS NULL OR _actual_at IS NULL OR coalesce(_letter,'') NOT LIKE uid::text || '/%' THEN RAISE EXCEPTION 'Select college, actual date/time and upload your call letter'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));

 -- Reuse an instant booking that is still open instead of creating a second one.
 SELECT id INTO bid FROM public.interview_bookings WHERE user_id=uid AND status='booked' AND start_now_until > now() ORDER BY created_at DESC LIMIT 1;
 IF bid IS NULL THEN
  IF EXISTS (SELECT 1 FROM public.interview_bookings b JOIN public.interview_slots sl ON sl.id=b.slot_id WHERE b.user_id=uid AND b.status='booked' AND sl.starts_at < now() + interval '30 minutes' AND sl.ends_at > now()) THEN
   RAISE EXCEPTION 'You already have an interview booked around this time. Open it from your booked interviews.';
  END IF;
  SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE user_id=uid;
  SELECT count(*) INTO n FROM public.interview_bookings b JOIN public.interview_slots sl ON sl.id=b.slot_id WHERE b.user_id=uid AND b.status='booked' AND (sl.ends_at > now() OR b.start_now_until > now());
  IF bal <= n THEN RAISE EXCEPTION 'No unreserved interview credits left'; END IF;
  -- Private on-demand slot: not published, so it never appears in the public slot list.
  INSERT INTO public.interview_slots(starts_at, ends_at, capacity, published, created_by)
   VALUES (now(), now() + interval '30 minutes', 1, false, uid) RETURNING id INTO sid;
  INSERT INTO public.interview_bookings(user_id, slot_id, start_now_until) VALUES (uid, sid, now() + interval '30 minutes') RETURNING id INTO bid;
 END IF;

 UPDATE public.interview_bookings SET practice_only=_practice, college_id=CASE WHEN _practice THEN NULL ELSE _college END, college_name=cname, actual_interview_at=CASE WHEN _practice THEN NULL ELSE _actual_at END, call_letter_path=CASE WHEN _practice THEN NULL ELSE _letter END WHERE id=bid;
 RETURN bid;
END $function$;

REVOKE ALL ON FUNCTION public.book_interview_now(boolean, uuid, timestamp with time zone, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_interview_now(boolean, uuid, timestamp with time zone, text) TO authenticated;