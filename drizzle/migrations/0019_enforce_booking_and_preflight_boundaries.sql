REVOKE ALL ON FUNCTION public.book_interview_slot(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.start_interview() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); bal integer; iid uuid; p public.profiles; b public.interview_bookings;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(uid::text));
 SELECT bookings.* INTO b FROM public.interview_bookings bookings JOIN public.interview_slots sl ON sl.id=bookings.slot_id WHERE bookings.user_id=uid AND bookings.status='booked' AND sl.starts_at <= now() AND sl.ends_at > now() AND bookings.checked_at > now()-interval '10 minutes' ORDER BY sl.starts_at LIMIT 1 FOR UPDATE OF bookings;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Book a slot and complete equipment checks during your scheduled time first'; END IF;
 IF b.preflight IS NULL OR jsonb_typeof(b.preflight) <> 'object' OR NOT (b.preflight @> '{"faceVisible":true,"cameraWorking":true,"micWorking":true,"micConfirmed":true,"consent":true}'::jsonb) OR jsonb_typeof(b.preflight->'downloadMbps') IS DISTINCT FROM 'number' OR jsonb_typeof(b.preflight->'latencyMs') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Complete all equipment checks first'; END IF;
 IF (b.preflight->>'downloadMbps')::numeric < 1 OR (b.preflight->>'latencyMs')::numeric >= 1500 THEN RAISE EXCEPTION 'Complete all equipment checks first'; END IF;
 IF NOT b.practice_only AND (b.college_id IS NULL OR b.actual_interview_at IS NULL OR b.call_letter_path IS NULL OR left(b.call_letter_path,length(uid::text)+1) <> uid::text || '/' OR NOT EXISTS(SELECT 1 FROM public.colleges WHERE id=b.college_id AND active)) THEN RAISE EXCEPTION 'Choose college, actual interview date/time and upload call letter, or select practice'; END IF;
 SELECT coalesce(sum(delta),0) INTO bal FROM public.credit_ledger WHERE user_id=uid;
 IF bal < 1 THEN RAISE EXCEPTION 'No interview credits left'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=uid;
 INSERT INTO public.interviews(user_id,category,difficulty) VALUES(uid,p.interview_category,p.difficulty) RETURNING id INTO iid;
 INSERT INTO public.credit_ledger(user_id,delta,reason,interview_id) VALUES(uid,-1,'Interview started',iid);
 UPDATE public.interview_bookings SET status='started',interview_id=iid WHERE id=b.id;
 RETURN iid;
END $$;
REVOKE ALL ON FUNCTION public.start_interview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_interview() TO authenticated;