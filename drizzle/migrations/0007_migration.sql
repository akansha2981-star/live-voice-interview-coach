CREATE OR REPLACE FUNCTION public.block_suspended() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND account_status = 'suspended') THEN
    RAISE EXCEPTION 'This account is suspended. Please contact support.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_block_suspended BEFORE INSERT ON public.interview_bookings FOR EACH ROW EXECUTE FUNCTION public.block_suspended();
CREATE TRIGGER interviews_block_suspended BEFORE INSERT ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.block_suspended();
CREATE OR REPLACE FUNCTION public.ticket_status_stamp() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolved','closed') AND OLD.status NOT IN ('resolved','closed') THEN NEW.resolved_at := now(); END IF;
  IF NEW.status NOT IN ('resolved','closed') THEN NEW.resolved_at := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tickets_touch_status BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.ticket_status_stamp();
-- Students may also record their own uploaded resume path visibility for staff documents list via profiles (already readable).