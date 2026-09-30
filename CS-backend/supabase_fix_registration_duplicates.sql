-- Merge existing duplicates, then prevent future duplicate registrations.
-- The oldest participant row is retained for each duplicate email/phone.

begin;

do $$
declare
  duplicate_row record;
  keeper_id uuid;
begin
  -- Merge duplicate emails first. Registrations are repointed before the
  -- duplicate participant row is removed so no registration is lost.
  for duplicate_row in
    select lower(trim(email)) as identity_value
    from public.participants
    where nullif(trim(email), '') is not null
    group by lower(trim(email))
    having count(*) > 1
  loop
    select p.id
    into keeper_id
    from public.participants p
    where lower(trim(p.email)) = duplicate_row.identity_value
    order by p.created_at nulls first, p.id
    limit 1;

    update public.registrations
    set participant_id = keeper_id
    where participant_id in (
      select p.id
      from public.participants p
      where lower(trim(p.email)) = duplicate_row.identity_value
        and p.id <> keeper_id
    );

    delete from public.participants p
    where lower(trim(p.email)) = duplicate_row.identity_value
      and p.id <> keeper_id;
  end loop;

  -- Merge any phone duplicates that remain after email merging.
  for duplicate_row in
    select trim(phone) as identity_value
    from public.participants
    where nullif(trim(phone), '') is not null
    group by trim(phone)
    having count(*) > 1
  loop
    select p.id
    into keeper_id
    from public.participants p
    where trim(p.phone) = duplicate_row.identity_value
    order by p.created_at nulls first, p.id
    limit 1;

    update public.registrations
    set participant_id = keeper_id
    where participant_id in (
      select p.id
      from public.participants p
      where trim(p.phone) = duplicate_row.identity_value
        and p.id <> keeper_id
    );

    delete from public.participants p
    where trim(p.phone) = duplicate_row.identity_value
      and p.id <> keeper_id;
  end loop;

  -- Keep the oldest payment for a duplicate UTR. The registration rows are
  -- retained, but their duplicate payment rows are removed.
  delete from public.payments duplicate_payment
  using public.payments keeper_payment
  where upper(trim(duplicate_payment.utr)) = upper(trim(keeper_payment.utr))
    and duplicate_payment.id <> keeper_payment.id
    and (
      duplicate_payment.submitted_at > keeper_payment.submitted_at
      or (
        duplicate_payment.submitted_at = keeper_payment.submitted_at
        and duplicate_payment.id > keeper_payment.id
      )
    );

  end;
  $$;

create unique index if not exists participants_email_unique_idx
  on public.participants (lower(trim(email)));

create unique index if not exists participants_phone_unique_idx
  on public.participants (trim(phone));

create unique index if not exists payments_utr_unique_idx
  on public.payments (upper(trim(utr)));

commit;
