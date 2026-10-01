insert into public.registration_fees(day, amount)
values ('DAY_1', 0), ('DAY_2', 0)
on conflict (day) do nothing;

create or replace function public.update_registration_fee(p_day text, p_amount numeric)
returns public.registration_fees
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.registration_fees;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_day not in ('DAY_1', 'DAY_2') or p_amount < 0 then
    raise exception 'A valid day and non-negative fee are required';
  end if;
  insert into public.registration_fees(day, amount, updated_at)
  values (p_day, p_amount, now())
  on conflict (day) do update
    set amount = excluded.amount, updated_at = excluded.updated_at
  returning * into result_row;
  return result_row;
end;
$$;

grant execute on function public.update_registration_fee(text, numeric) to authenticated;
