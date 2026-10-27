CREATE OR REPLACE FUNCTION public.finance_save(_kind text,_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; linked uuid[]; expected_count integer;
BEGIN
IF NOT public.can_operate(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _kind='expense' THEN
IF length(trim(_data->>'reference'))<1 OR length(_data->>'reference')>200 OR length(trim(_data->>'provider'))<1 THEN RAISE EXCEPTION 'Provider and billing reference required'; END IF;
INSERT INTO public.finance_expenses(occurred_at,category,product,provider,amount,currency,reference,notes,created_by) VALUES((_data->>'occurred_at')::timestamptz,_data->>'category',_data->>'product',trim(_data->>'provider'),(_data->>'amount')::numeric,_data->>'currency',trim(_data->>'reference'),left(coalesce(_data->>'notes',''),1000),auth.uid()) RETURNING id INTO result;
SELECT array_agg(value::uuid) INTO linked FROM jsonb_array_elements_text(coalesce(_data->'usage_ids','[]'));
IF linked IS NOT NULL THEN
PERFORM id FROM public.finance_usage WHERE id=ANY(linked) FOR UPDATE;
SELECT count(*) INTO expected_count FROM public.finance_usage WHERE id=ANY(linked) AND expense_id IS NULL AND provider=_data->>'provider' AND (_data->>'product'='shared' OR product=_data->>'product');
IF expected_count<>cardinality(linked) THEN RAISE EXCEPTION 'Usage is missing, already reconciled, or belongs to another provider/product'; END IF;
UPDATE public.finance_usage SET expense_id=result WHERE id=ANY(linked);
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
PERFORM public.log_audit('finance_'||_kind,auth.uid(),jsonb_build_object('id',result)); RETURN result;
END; $$;