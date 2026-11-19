-- Run after private-calendar.sql and repro-keyword-blocks.sql.
begin;
create table if not exists public.fl_calendar_closures(
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 160),
 notes text not null default '',starts_at timestamptz not null,ends_at timestamptz not null,
 updated_at timestamptz not null default now(),check(ends_at>starts_at));
alter table public.fl_calendar_closures enable row level security;
revoke all on public.fl_calendar_closures from public,anon,authenticated;

create or replace function public.fl_calendar_closures_list(p_from timestamptz,p_to timestamptz)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(c order by starts_at),'[]'::jsonb) from fl_calendar_closures c
 where starts_at<p_to and ends_at>p_from;
$$;
create or replace function public.fl_calendar_closure_save(p_id uuid,p_title text,p_notes text,p_start timestamptz,p_end timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('factor-lambda-closures',0));
 if p_end<=p_start or p_end-p_start>interval '367 days' or length(trim(p_title)) not between 1 and 160 then raise exception 'Invalid closure';end if;
 if p_id is null then
 insert into fl_calendar_closures(title,notes,starts_at,ends_at) values(trim(p_title),left(coalesce(p_notes,''),2000),p_start,p_end) returning id into result;
 else
 update fl_calendar_closures set title=trim(p_title),notes=left(coalesce(p_notes,''),2000),starts_at=p_start,ends_at=p_end,updated_at=now() where id=p_id returning id into result;
 if result is null then raise exception 'Closure not found';end if;
 end if;
 return jsonb_build_object('id',result,'message','Cierre guardado. Las citas existentes se conservan.');
end;$$;
create or replace function public.fl_calendar_closure_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('factor-lambda-closures',0));
 delete from fl_calendar_closures where id=p_id;
 return jsonb_build_object('message','Cierre eliminado.');
end;$$;

-- Preserve existing availability rules and add closures to both public services.
do $$ begin
 if to_regprocedure('public.fl_repro_busy_before_closures(date,text)') is null then
 alter function public.fl_repro_busy(date,text) rename to fl_repro_busy_before_closures;
 end if;
 if to_regprocedure('public.fl_consult_busy_before_closures(date,text,text)') is null then
 alter function public.fl_consult_busy(date,text,text) rename to fl_consult_busy_before_closures;
 end if;
end;$$;
create or replace function public.fl_repro_busy(p_day date,p_mode text)
returns table(starts_at timestamptz,ends_at timestamptz) language sql security definer set search_path=public,pg_temp as $$
 select * from fl_repro_busy_before_closures(p_day,p_mode)
 union all select c.starts_at,c.ends_at from fl_calendar_closures c
 where c.starts_at<((p_day+1)::timestamp at time zone 'Europe/Madrid') and c.ends_at>(p_day::timestamp at time zone 'Europe/Madrid');
$$;
create or replace function public.fl_consult_busy(p_day date,p_professional text,p_mode text)
returns table(starts_at timestamptz,ends_at timestamptz) language sql security definer set search_path=public,pg_temp as $$
 select * from fl_consult_busy_before_closures(p_day,p_professional,p_mode)
 union all select c.starts_at,c.ends_at from fl_calendar_closures c
 where c.starts_at<((p_day+1)::timestamp at time zone 'Europe/Madrid') and c.ends_at>(p_day::timestamp at time zone 'Europe/Madrid');
$$;
create or replace function public.fl_calendar_guard_closure()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('factor-lambda-closures',0));
 if tg_op='UPDATE' then
 if old.starts_at=new.starts_at and old.ends_at=new.ends_at and old.state in ('held','creating','confirmed') then return new;end if;
 end if;
 if new.state in ('held','creating','confirmed') and exists(
 select 1 from fl_quote_requests q where q.id=new.quote_id and coalesce(q.config->>'manualAppointment','false')<>'true')
 and exists(select 1 from fl_calendar_closures c where c.starts_at<new.ends_at and c.ends_at>new.starts_at)
 then raise exception 'Workshop closed' using errcode='23P01';end if;
 return new;
end;$$;
drop trigger if exists fl_calendar_guard_closure on public.fl_repro_bookings;
create trigger fl_calendar_guard_closure before insert or update on public.fl_repro_bookings for each row execute function public.fl_calendar_guard_closure();
revoke all on function public.fl_calendar_closures_list(timestamptz,timestamptz),public.fl_calendar_closure_save(uuid,text,text,timestamptz,timestamptz),public.fl_calendar_closure_delete(uuid),public.fl_calendar_guard_closure(),public.fl_repro_busy(date,text),public.fl_consult_busy(date,text,text) from public,anon,authenticated;
grant execute on function public.fl_calendar_closures_list(timestamptz,timestamptz),public.fl_calendar_closure_save(uuid,text,text,timestamptz,timestamptz),public.fl_calendar_closure_delete(uuid),public.fl_repro_busy(date,text),public.fl_consult_busy(date,text,text) to service_role;
commit;
