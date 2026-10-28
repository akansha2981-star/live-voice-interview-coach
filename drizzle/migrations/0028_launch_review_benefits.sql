DROP INDEX IF EXISTS public.resume_analyses_one_credit;
CREATE UNIQUE INDEX resume_analyses_one_processing ON public.resume_analyses(user_id) WHERE status = 'processing';
ALTER TABLE public.sop_reviews ADD COLUMN IF NOT EXISTS free_credit_slot text;
CREATE OR REPLACE FUNCTION public.reserve_free_sop_credit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE general_used boolean; nmims_used boolean; is_nmims boolean;
BEGIN
 IF NEW.status <> 'under_review' THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 904));
 SELECT EXISTS(SELECT 1 FROM public.sop_reviews WHERE user_id=NEW.user_id AND free_credit_slot='general' AND status IN ('under_review','completed')), EXISTS(SELECT 1 FROM public.sop_reviews WHERE user_id=NEW.user_id AND free_credit_slot='nmims' AND status IN ('under_review','completed')) INTO general_used,nmims_used;
 IF EXISTS(SELECT 1 FROM public.sop_reviews WHERE user_id=NEW.user_id AND status='under_review' AND created_at > now()-interval '20 minutes') THEN RAISE EXCEPTION 'An SOP review is already in progress'; END IF;
 is_nmims := NEW.college_name ~* '(nmims|narsee monjee)';
 IF is_nmims AND NOT nmims_used THEN NEW.free_credit_slot := 'nmims';
 ELSIF NOT general_used THEN NEW.free_credit_slot := 'general';
 ELSIF NOT nmims_used THEN RAISE EXCEPTION 'Your remaining free SOP credit is reserved for NMIMS';
 ELSE RAISE EXCEPTION 'Both free SOP review credits have been used'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reserve_free_sop_credit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reserve_free_sop_credit BEFORE INSERT ON public.sop_reviews FOR EACH ROW EXECUTE FUNCTION public.reserve_free_sop_credit();
CREATE OR REPLACE FUNCTION public.complete_course_payment(_user_id uuid,_course_id uuid,_order_id text,_payment_id text,_amount numeric,_currency text,_credits integer,_course_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE purchase_id uuid;
BEGIN
 IF _amount <= 0 OR _currency <> 'INR' OR _credits < 0 THEN RAISE EXCEPTION 'Invalid payment'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_order_id, 905));
 SELECT id INTO purchase_id FROM public.course_purchases WHERE order_id=_order_id AND user_id=_user_id;
 IF purchase_id IS NOT NULL THEN RETURN purchase_id; END IF;
 INSERT INTO public.course_purchases(user_id,course_id,course_name,order_id,amount,currency,payment_status,source,interview_credits) VALUES(_user_id,_course_id,_course_name,_order_id,_amount,_currency,'paid','razorpay',_credits) RETURNING id INTO purchase_id;
 IF _credits > 0 THEN INSERT INTO public.credit_ledger(user_id,delta,reason) VALUES(_user_id,_credits,'Purchase: ' || _course_name || ' (' || _payment_id || ')'); END IF;
 INSERT INTO public.audit_logs(actor_id,action,target_user,details) VALUES(_user_id,'verified_course_payment',_user_id,jsonb_build_object('purchase_id',purchase_id,'order_id',_order_id,'payment_id',_payment_id,'amount',_amount,'credits',_credits));
 RETURN purchase_id;
END $$;
REVOKE ALL ON FUNCTION public.complete_course_payment(uuid,uuid,text,text,numeric,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_course_payment(uuid,uuid,text,text,numeric,text,integer,text) TO service_role;