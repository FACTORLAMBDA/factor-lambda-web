-- Run after direct-repro-bookings.sql. Existing reprogramming bookings are preserved.
begin;
set local search_path=public,extensions;
alter table public.fl_repro_bookings add column if not exists resource text not null default 'repro';
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.fl_repro_bookings'::regclass and contype='x'
    and conname in ('fl_booking_resource_overlap','fl_repro_bookings_stripe_mode_tstzrange_excl')
  loop execute format('alter table public.fl_repro_bookings drop constraint %I',c.conname);end loop;
end; $$;
alter table public.fl_repro_bookings add constraint fl_booking_resource_overlap
  exclude using gist(stripe_mode with =,resource with =,tstzrange(starts_at,ends_at,'[)') with &&)
  where(state in ('held','creating','confirmed'));

create or replace function public.fl_repro_busy(p_day date,p_mode text)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select b.starts_at,b.ends_at from public.fl_repro_bookings b where b.stripe_mode=p_mode and b.resource='repro'
 and b.state in ('held','creating','confirmed') and b.starts_at<((p_day+1)::timestamp at time zone 'Europe/Madrid')
 and b.ends_at>(p_day::timestamp at time zone 'Europe/Madrid');
$$;
create or replace function public.fl_consult_busy(p_day date,p_professional text,p_mode text)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select b.starts_at,b.ends_at from public.fl_repro_bookings b where b.stripe_mode=p_mode and b.resource='consult-'||p_professional
 and b.state in ('held','creating','confirmed') and b.starts_at<((p_day+1)::timestamp at time zone 'Europe/Madrid')
 and b.ends_at>(p_day::timestamp at time zone 'Europe/Madrid');
$$;
create or replace function public.fl_consult_validate(p_config jsonb,p_appointment jsonb)
returns void language plpgsql set search_path=public,pg_temp as $$
declare s timestamptz; e timestamptz; ls timestamp; le timestamp; professional text; topic text;
begin
 s:=(p_appointment->>'start')::timestamptz;e:=(p_appointment->>'end')::timestamptz;
 ls:=s at time zone 'Europe/Madrid';le:=e at time zone 'Europe/Madrid';topic:=p_config->'consultation'->>'topic';
 professional:=case when topic in ('tuning','exhausts') then 'joaquin' else 'german' end;
 if s is null or e is null or s<now()+interval '45 minutes' or s>now()+interval '180 days'
 or extract(isodow from ls)>5 or ls::date<>le::date or extract(second from ls)<>0 or extract(minute from ls) not in (0,30)
 or e<>s+interval '30 minutes' or ls::time<'08:00' or le::time>(case when professional='joaquin' then time '16:00' else time '15:30' end)
 or p_appointment->>'day' is distinct from to_char(ls,'YYYY-MM-DD') or p_appointment->>'time' is distinct from to_char(ls,'HH24:MI')
 or p_appointment->>'endTime' is distinct from to_char(le,'HH24:MI')
 or p_config->'consultation'->>'professional' is distinct from professional
 then raise exception 'Invalid consultation appointment';end if;
end; $$;
create or replace function public.fl_consult_hold(p_id uuid,p_version uuid,p_customer jsonb,p_vehicle jsonb,p_config jsonb,p_mode text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests; total integer; topic text; mode text; professional text;
begin
 topic:=p_config->'consultation'->>'topic';mode:=p_config->'consultation'->>'mode';
 if p_mode is null or p_mode not in ('test','live') or mode is null or mode not in ('phone','visit')
 or topic is null or topic not in ('mechanics','tuning','online-quote','quick-mechanics','dynamic-test','exhausts','other-help')
 or p_config->>'serviceKind' is distinct from 'consultation' or p_config->>'flow' is distinct from 'direct-v1'
 or p_config->>'dyno' is distinct from 'false' then raise exception 'Invalid consultation';end if;
 perform public.fl_consult_validate(p_config,p_config->'appointment');
 professional:=case when topic in ('tuning','exhausts') then 'joaquin' else 'german' end;
 total:=case when topic='online-quote' or mode='visit' then 3000 else 2500 end;
 if (p_config->'pricing'->>'totalCents')::integer is distinct from total
 or (p_config->'pricing'->>'softwareGrossCents')::integer is distinct from total
 or (p_config->'pricing'->>'dynoGrossCents')::integer is distinct from 0
 or p_config->'pricing'->>'currency' is distinct from 'eur' or p_config->'pricing'->>'country' is distinct from 'ES'
 then raise exception 'Invalid consultation price';end if;
 insert into public.fl_quote_requests(id,version,status,customer,vehicle,config,base_cents,total_cents,stripe_mode)
 values(p_id,p_version,'sent',p_customer,p_vehicle,p_config,total,total,p_mode) returning * into q;
 insert into public.fl_repro_bookings(quote_id,stripe_mode,starts_at,ends_at,resource)
 values(p_id,p_mode,(p_config->'appointment'->>'start')::timestamptz,(p_config->'appointment'->>'end')::timestamptz,'consult-'||professional);
 return to_jsonb(q);
end; $$;
create or replace function public.fl_consult_admin_move(p_id uuid,p_appointment jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests; b public.fl_repro_bookings;
begin
 select * into q from public.fl_quote_requests where id=p_id for update;
 select * into b from public.fl_repro_bookings where quote_id=p_id for update;
 if q.id is null or q.status<>'paid' or b.state is distinct from 'confirmed' or q.config->>'adminCancelled'='true'
 or q.config->>'serviceKind' is distinct from 'consultation' then raise exception 'Only confirmed paid bookings can be moved';end if;
 perform public.fl_consult_validate(q.config,p_appointment);
 update public.fl_repro_bookings set starts_at=(p_appointment->>'start')::timestamptz,ends_at=(p_appointment->>'end')::timestamptz where quote_id=p_id;
 q.config:=jsonb_set(q.config,'{adminHistory}',coalesce(q.config->'adminHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object('action','move','at',now(),'reason',left(p_reason,500),'previousAppointment',q.config->'appointment')));
 update public.fl_quote_requests set config=q.config||jsonb_build_object('appointment',p_appointment) where id=p_id;
 return jsonb_build_object('id',p_id,'action','move');
end; $$;
revoke all on function public.fl_consult_validate(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.fl_consult_busy(date,text,text) from public,anon,authenticated;
revoke all on function public.fl_consult_hold(uuid,uuid,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
revoke all on function public.fl_consult_admin_move(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.fl_consult_busy(date,text,text) to service_role;
grant execute on function public.fl_consult_hold(uuid,uuid,jsonb,jsonb,jsonb,text) to service_role;
grant execute on function public.fl_consult_admin_move(uuid,jsonb,text) to service_role;
commit;
