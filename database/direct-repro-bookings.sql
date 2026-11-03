-- Run in Supabase SQL Editor after repro-quotes.sql. Keeps existing quotes intact.
begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;
do $$ declare item record; begin
  for item in select conname from pg_constraint where conrelid='public.fl_quote_requests'::regclass and contype='c'
    and conname in ('fl_quote_requests_check','fl_quote_total_check')
    and pg_get_constraintdef(oid) like '%total_cents%' and pg_get_constraintdef(oid) like '%base_cents%'
  loop execute format('alter table public.fl_quote_requests drop constraint %I',item.conname); end loop;
end; $$;
alter table public.fl_quote_requests add constraint fl_quote_total_check check (
  (base_cents is null and total_cents is null) or
  (base_cents>0 and total_cents=base_cents+case when config->>'flow'='direct-v1'
    then (config->'pricing'->>'dynoGrossCents')::integer
    when config->>'dyno'='true' then 5000 else 0 end)
);
create table if not exists public.fl_repro_bookings (
  quote_id uuid primary key references public.fl_quote_requests(id),
  stripe_mode text not null check(stripe_mode in ('test','live')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  state text not null default 'held' check(state in ('held','creating','confirmed','released')),
  check(ends_at>starts_at),
  exclude using gist (stripe_mode with =,tstzrange(starts_at,ends_at,'[)') with &&) where(state in ('held','creating','confirmed'))
);
alter table public.fl_repro_bookings enable row level security;
revoke all on public.fl_repro_bookings from anon,authenticated;

create or replace function public.fl_repro_busy(p_day date,p_mode text)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
  select b.starts_at,b.ends_at from public.fl_repro_bookings b
  where b.stripe_mode=p_mode and b.state in ('held','creating','confirmed')
  and b.starts_at < ((p_day+1)::timestamp at time zone 'Europe/Madrid')
  and b.ends_at > (p_day::timestamp at time zone 'Europe/Madrid');
$$;
create or replace function public.fl_repro_pending(p_day date,p_mode text)
returns table(quote_id uuid,quote_version uuid,session_id text,total_cents integer)
language sql security definer set search_path=public,pg_temp as $$
  select q.id,q.version,q.stripe_session_id,q.total_cents from public.fl_repro_bookings b join public.fl_quote_requests q on q.id=b.quote_id
  where b.stripe_mode=p_mode and b.state='held' and q.status<>'paid'
    and b.starts_at < ((p_day+1)::timestamp at time zone 'Europe/Madrid')
    and b.ends_at > (p_day::timestamp at time zone 'Europe/Madrid')
    and (q.config->>'checkoutExpiresAt')::bigint < extract(epoch from now()) limit 100;
$$;
create or replace function public.fl_repro_hold(p_id uuid,p_version uuid,p_customer jsonb,p_vehicle jsonb,p_config jsonb,p_mode text,p_start timestamptz,p_end timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests; local_start timestamp; local_end timestamp; duration integer;
begin
  local_start:=p_start at time zone 'Europe/Madrid'; local_end:=p_end at time zone 'Europe/Madrid';
  duration:=case when p_config->>'dyno'='true' then 150 else 90 end;
  if p_mode not in ('test','live') or p_config->>'flow'<>'direct-v1' or p_config->>'brand' not in ('TLR SPORT','REVO')
    or p_start<now()+interval '45 minutes' or p_start>now()+interval '180 days'
    or extract(isodow from local_start)>5 or local_start::date<>local_end::date
    or extract(second from local_start)<>0 or extract(minute from local_start) not in (0,30)
    or p_end<>p_start+make_interval(mins=>duration)
    or not ((local_start::time>='08:00' and local_end::time<='13:00') or (local_start::time>='14:00' and local_end::time<='17:00'))
  then raise exception 'Invalid booking'; end if;
  if (p_config->'pricing'->>'softwareGrossCents')::integer<=0
    or p_config->'pricing'->>'currency'<>'eur' or p_config->'pricing'->>'country'<>'ES'
    or (p_config->'pricing'->>'softwareNetCents')::integer<=0
    or (p_config->'pricing'->>'softwareGrossCents')::integer<>(p_config->'pricing'->>'softwareNetCents')::integer+round((p_config->'pricing'->>'softwareNetCents')::numeric*21/100)::integer
    or (p_config->'pricing'->>'dynoGrossCents')::integer<>(case when p_config->>'dyno'<>'true' then 0 when p_config->>'brand'='REVO' then 8000 else 10000 end)
    or (p_config->'pricing'->>'totalCents')::integer<>(p_config->'pricing'->>'softwareGrossCents')::integer+(p_config->'pricing'->>'dynoGrossCents')::integer
  then raise exception 'Invalid price'; end if;
  insert into public.fl_quote_requests(id,version,status,customer,vehicle,config,base_cents,total_cents,stripe_mode)
  values(p_id,p_version,'sent',p_customer,p_vehicle,p_config,(p_config->'pricing'->>'softwareGrossCents')::integer,(p_config->'pricing'->>'totalCents')::integer,p_mode) returning * into q;
  insert into public.fl_repro_bookings(quote_id,stripe_mode,starts_at,ends_at) values(p_id,p_mode,p_start,p_end);
  return to_jsonb(q);
end; $$;
create or replace function public.fl_repro_transition(p_id uuid,p_state text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_state='confirmed' then
    update public.fl_repro_bookings set state='confirmed' where quote_id=p_id and state in ('held','creating','confirmed');
    if not found then raise exception 'Booking is not held'; end if;
  elsif p_state='released' then
    if exists(select 1 from public.fl_repro_bookings where quote_id=p_id and state='creating') then raise exception 'Checkout in progress'; end if;
    update public.fl_repro_bookings set state='released' where quote_id=p_id and state='held';
  else raise exception 'Invalid transition'; end if;
end; $$;
create or replace function public.fl_repro_begin_checkout(p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.fl_repro_bookings set state='creating' where quote_id=p_id and state='held' and starts_at>now();
  if not found then raise exception 'Booking is not held'; end if;
end; $$;
create or replace function public.fl_repro_end_checkout(p_id uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
  update public.fl_repro_bookings set state='held' where quote_id=p_id and state='creating';
$$;
revoke all on function public.fl_repro_busy(date,text) from public,anon,authenticated;
revoke all on function public.fl_repro_pending(date,text) from public,anon,authenticated;
revoke all on function public.fl_repro_hold(uuid,uuid,jsonb,jsonb,jsonb,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.fl_repro_transition(uuid,text) from public,anon,authenticated;
revoke all on function public.fl_repro_begin_checkout(uuid) from public,anon,authenticated;
revoke all on function public.fl_repro_end_checkout(uuid) from public,anon,authenticated;
grant execute on function public.fl_repro_busy(date,text) to service_role;
grant execute on function public.fl_repro_pending(date,text) to service_role;
grant execute on function public.fl_repro_hold(uuid,uuid,jsonb,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.fl_repro_transition(uuid,text) to service_role;
grant execute on function public.fl_repro_begin_checkout(uuid) to service_role;
grant execute on function public.fl_repro_end_checkout(uuid) to service_role;
commit;
