ALTER TABLE public.colleges ADD COLUMN duration_minutes integer NOT NULL DEFAULT 20 CHECK (duration_minutes BETWEEN 5 AND 60), ADD COLUMN question_count integer NOT NULL DEFAULT 9 CHECK (question_count BETWEEN 3 AND 30), ADD COLUMN question_min_seconds integer NOT NULL DEFAULT 30 CHECK (question_min_seconds BETWEEN 10 AND 300), ADD COLUMN question_max_seconds integer NOT NULL DEFAULT 120 CHECK (question_max_seconds BETWEEN 20 AND 600);
ALTER TABLE public.colleges ADD CONSTRAINT college_question_budget CHECK (question_max_seconds >= question_min_seconds AND question_count * question_min_seconds + 15 <= duration_minutes * 60);
ALTER TABLE public.interviews ADD COLUMN limit_duration_seconds integer, ADD COLUMN limit_question_count integer, ADD COLUMN limit_question_min_seconds integer, ADD COLUMN limit_question_max_seconds integer, ADD COLUMN limit_deadline timestamptz, ADD COLUMN limit_closed_reason text;
ALTER TABLE public.resume_analyses ADD COLUMN analysis_progress jsonb;
ALTER TABLE public.sop_reviews ADD COLUMN analysis_progress jsonb;
CREATE OR REPLACE FUNCTION public.admin_save_college_limits(_id uuid, _name text, _duration integer, _count integer, _min integer, _max integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
 IF NOT coalesce(public.can_operate(auth.uid()),false) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF length(trim(_name)) NOT BETWEEN 2 AND 120 OR _duration IS NULL OR _count IS NULL OR _min IS NULL OR _max IS NULL THEN RAISE EXCEPTION 'Invalid college settings'; END IF;
 IF _id IS NULL THEN INSERT INTO public.colleges(name,duration_minutes,question_count,question_min_seconds,question_max_seconds) VALUES(trim(_name),_duration,_count,_min,_max) RETURNING id INTO cid;
 ELSE UPDATE public.colleges SET name=trim(_name),duration_minutes=_duration,question_count=_count,question_min_seconds=_min,question_max_seconds=_max WHERE id=_id RETURNING id INTO cid; END IF;
 IF cid IS NULL THEN RAISE EXCEPTION 'College not found'; END IF;
 INSERT INTO public.audit_logs(actor_id,action,details) VALUES(auth.uid(),'college_limits_saved',jsonb_build_object('college_id',cid,'duration',_duration,'questions',_count,'min_seconds',_min,'max_seconds',_max));
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.admin_save_college_limits(uuid,text,integer,integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_college_limits(uuid,text,integer,integer,integer,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.book_interview_with_details(_slot_id uuid,_practice boolean,_college uuid,_actual_at timestamptz,_letter text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bid uuid; cname text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF _practice IS NULL THEN RAISE EXCEPTION 'Choose interview type'; END IF;
 IF NOT _practice THEN
  SELECT name INTO cname FROM public.colleges WHERE id=_college AND active;
  IF cname IS NULL OR _actual_at IS NULL OR coalesce(_letter,'') NOT LIKE auth.uid()::text || '/%' THEN RAISE EXCEPTION 'Select college, actual date/time and upload your call letter'; END IF;
 END IF;
 bid:=public.book_interview_slot(_slot_id);
 UPDATE public.interview_bookings SET practice_only=_practice,college_id=CASE WHEN _practice THEN NULL ELSE _college END,college_name=cname,actual_interview_at=CASE WHEN _practice THEN NULL ELSE _actual_at END,call_letter_path=CASE WHEN _practice THEN NULL ELSE _letter END WHERE id=bid;
 RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.book_interview_with_details(uuid,boolean,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.book_interview_with_details(uuid,boolean,uuid,timestamptz,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.snapshot_interview_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.interview_bookings; c public.colleges; duration integer;
BEGIN
 SELECT bookings.* INTO b FROM public.interview_bookings bookings JOIN public.interview_slots sl ON sl.id=bookings.slot_id WHERE bookings.user_id=NEW.user_id AND bookings.status='booked' AND bookings.checked_at > now()-interval '10 minutes' AND sl.starts_at <= now() AND sl.ends_at > now() ORDER BY sl.starts_at LIMIT 1;
 IF b.college_id IS NOT NULL AND NOT b.practice_only THEN SELECT * INTO c FROM public.colleges WHERE id=b.college_id AND active; END IF;
 SELECT duration_minutes INTO duration FROM public.interview_settings WHERE id=1;
 NEW.limit_duration_seconds:=coalesce(c.duration_minutes,duration,20)*60;
 NEW.limit_question_count:=coalesce(c.question_count,9);
 NEW.limit_question_min_seconds:=coalesce(c.question_min_seconds,30);
 NEW.limit_question_max_seconds:=coalesce(c.question_max_seconds,120);
 NEW.limit_deadline:=NEW.started_at + make_interval(secs=>NEW.limit_duration_seconds);
 RETURN NEW;
END $$;
CREATE TRIGGER interview_limits_snapshot BEFORE INSERT ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.snapshot_interview_limits();