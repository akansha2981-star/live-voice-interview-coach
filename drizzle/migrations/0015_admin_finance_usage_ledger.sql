CREATE FUNCTION public.can_read_finance(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.can_operate(_user_id) OR public.has_role(_user_id,'analyst'); $$;
REVOKE ALL ON FUNCTION public.can_read_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_finance(uuid) TO authenticated, service_role;
CREATE TABLE public.finance_rates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, model text NOT NULL, service text NOT NULL, unit text NOT NULL CHECK(unit IN ('input_tokens','output_tokens','cached_input_tokens','seconds')), currency text NOT NULL CHECK(currency IN ('INR','USD','credits')), unit_price numeric NOT NULL CHECK(unit_price>=0), per_quantity numeric NOT NULL CHECK(per_quantity>0), effective_at timestamptz NOT NULL, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,model,service,unit,effective_at));
GRANT SELECT ON public.finance_rates TO authenticated; GRANT ALL ON public.finance_rates TO service_role;
ALTER TABLE public.finance_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_rates_read ON public.finance_rates FOR SELECT TO authenticated USING(public.can_read_finance(auth.uid()));
CREATE TABLE public.finance_expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL, category text NOT NULL CHECK(category IN ('api','developer','personal_api','hosting','other')), product text NOT NULL CHECK(product IN ('interview','resume','sop','training','profile_resume','shared')), provider text NOT NULL, amount numeric NOT NULL CHECK(amount>=0), currency text NOT NULL CHECK(currency IN ('INR','USD','credits')), reference text NOT NULL, notes text NOT NULL DEFAULT '', source text NOT NULL DEFAULT 'manual_billed', voided_at timestamptz, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,reference));
GRANT SELECT ON public.finance_expenses TO authenticated; GRANT ALL ON public.finance_expenses TO service_role;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_expenses_read ON public.finance_expenses FOR SELECT TO authenticated USING(public.can_read_finance(auth.uid()));
CREATE TABLE public.finance_usage (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text UNIQUE NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), provider text NOT NULL, model text NOT NULL, service text NOT NULL, product text NOT NULL CHECK(product IN ('interview','resume','sop','training','profile_resume')), user_id uuid, transaction_id text, status text NOT NULL CHECK(status IN ('started','completed','failed','unconfirmed')), input_tokens bigint, output_tokens bigint, cached_input_tokens bigint, reasoning_tokens bigint, seconds numeric, finalized boolean NOT NULL DEFAULT false, estimates jsonb NOT NULL DEFAULT '{}', pricing_snapshot jsonb NOT NULL DEFAULT '[]', expense_id uuid REFERENCES public.finance_expenses(id), recorded_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.finance_usage TO authenticated; GRANT ALL ON public.finance_usage TO service_role;
ALTER TABLE public.finance_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_usage_read ON public.finance_usage FOR SELECT TO authenticated USING(public.can_read_finance(auth.uid()));
CREATE INDEX finance_usage_date ON public.finance_usage(occurred_at DESC,id); CREATE INDEX finance_usage_transaction ON public.finance_usage(product,transaction_id);
CREATE INDEX finance_expenses_date ON public.finance_expenses(occurred_at DESC,id);
CREATE TABLE public.finance_balances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, balance numeric NOT NULL CHECK(balance>=0), currency text NOT NULL CHECK(currency IN ('INR','USD','credits')), spending_limit numeric CHECK(spending_limit>=0), as_of timestamptz NOT NULL, notes text NOT NULL DEFAULT '', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.finance_balances TO authenticated; GRANT ALL ON public.finance_balances TO service_role;
ALTER TABLE public.finance_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_balances_read ON public.finance_balances FOR SELECT TO authenticated USING(public.can_read_finance(auth.uid()));
CREATE FUNCTION public.finance_save(_kind text,_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; linked uuid[];
BEGIN
IF NOT public.can_operate(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _kind='expense' THEN
IF length(trim(_data->>'reference'))<1 OR length(_data->>'reference')>200 OR length(trim(_data->>'provider'))<1 THEN RAISE EXCEPTION 'Provider and billing reference required'; END IF;
INSERT INTO public.finance_expenses(occurred_at,category,product,provider,amount,currency,reference,notes,created_by) VALUES((_data->>'occurred_at')::timestamptz,_data->>'category',_data->>'product',trim(_data->>'provider'),(_data->>'amount')::numeric,_data->>'currency',trim(_data->>'reference'),left(coalesce(_data->>'notes',''),1000),auth.uid()) RETURNING id INTO result;
SELECT array_agg(value::uuid) INTO linked FROM jsonb_array_elements_text(coalesce(_data->'usage_ids','[]'));
IF linked IS NOT NULL THEN
IF EXISTS(SELECT 1 FROM public.finance_usage WHERE id=ANY(linked) AND (expense_id IS NOT NULL OR currency_check_placeholder(provider))) THEN NULL; END IF;
END IF;
ELSIF _kind='rate' THEN
INSERT INTO public.finance_rates(provider,model,service,unit,currency,unit_price,per_quantity,effective_at,created_by) VALUES(_data->>'provider',_data->>'model',_data->>'service',_data->>'unit',_data->>'currency',(_data->>'unit_price')::numeric,(_data->>'per_quantity')::numeric,(_data->>'effective_at')::timestamptz,auth.uid()) RETURNING id INTO result;
ELSIF _kind='balance' THEN
INSERT INTO public.finance_balances(provider,balance,currency,spending_limit,as_of,notes,created_by) VALUES(_data->>'provider',(_data->>'balance')::numeric,_data->>'currency',nullif(_data->>'spending_limit','')::numeric,(_data->>'as_of')::timestamptz,left(coalesce(_data->>'notes',''),1000),auth.uid()) RETURNING id INTO result;
ELSIF _kind='void' THEN
UPDATE public.finance_expenses SET voided_at=now() WHERE id=(_data->>'id')::uuid AND voided_at IS NULL RETURNING id INTO result;
IF result IS NULL THEN RAISE EXCEPTION 'Expense not found'; END IF;
UPDATE public.finance_usage SET expense_id=NULL WHERE expense_id=result;
ELSE RAISE EXCEPTION 'Unknown finance action'; END IF;
PERFORM public.log_audit('finance_'||_kind,auth.uid(),jsonb_build_object('id',result));
RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.finance_save(text,jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.finance_save(text,jsonb) TO authenticated;