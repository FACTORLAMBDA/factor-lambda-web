-- Run once in Supabase SQL Editor after direct-repro-bookings.sql.
begin;
create or replace function public.fl_repro_admin_action(p_id uuid,p_action text,p_appointment jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests; b public.fl_repro_bookings; s timestamptz; e timestamptz; ls timestamp; le timestamp; event jsonb;
begin
  select * into q from public.fl_quote_requests where id=p_id for update;
  if not found then raise exception 'Request not found'; end if;
  select * into b from public.fl_repro_bookings where quote_id=p_id for update;
  if b.state='creating' then raise exception 'Checkout in progress'; end if;
  if p_action='archive' then
    if q.status='paid' or q.stripe_session_id is not null or b.state in ('held','confirmed') then raise exception 'Cannot archive active payment or booking'; end if;
    q.config:=q.config||jsonb_build_object('adminArchived',true);
  elsif p_action='move' then
    if q.status<>'paid' or b.state<>'confirmed' or q.config->>'adminCancelled'='true' then raise exception 'Only confirmed paid bookings can be moved'; end if;
    s:=(p_appointment->>'start')::timestamptz; e:=(p_appointment->>'end')::timestamptz;
    ls:=s at time zone 'Europe/Madrid';le:=e at time zone 'Europe/Madrid';
    if s is null or e is null or s<now()+interval '45 minutes' or s>now()+interval '180 days'
      or extract(isodow from ls)>5 or ls::date<>le::date or extract(second from ls)<>0 or extract(minute from ls) not in (0,30)
      or e<>s+make_interval(mins=>case when q.config->>'dyno'='true' then 150 else 90 end)
      or not ((ls::time>='08:00' and le::time<='13:00') or (ls::time>='14:00' and le::time<='17:00'))
      or p_appointment->>'day'<>to_char(ls,'YYYY-MM-DD') or p_appointment->>'time'<>to_char(ls,'HH24:MI')
    then raise exception 'Invalid appointment'; end if;
    update public.fl_repro_bookings set starts_at=s,ends_at=e where quote_id=p_id;
    q.config:=q.config||jsonb_build_object('appointment',p_appointment);
  elsif p_action='cancel' then
    if b.quote_id is null then raise exception 'No appointment'; end if;
    if q.status<>'paid' and b.state<>'released' then raise exception 'Expire payment before cancelling'; end if;
    update public.fl_repro_bookings set state='released' where quote_id=p_id;
    q.config:=q.config||jsonb_build_object('adminCancelled',true);
  else raise exception 'Invalid action'; end if;
  event:=jsonb_build_object('action',p_action,'at',now(),'reason',left(p_reason,500),'previousAppointment',q.config->'appointment');
  -- Record the original appointment for moves rather than the new one.
  if p_action='move' then event:=event||jsonb_build_object('previousAppointment',(select config->'appointment' from public.fl_quote_requests where id=p_id));end if;
  q.config:=jsonb_set(q.config,'{adminHistory}',coalesce(q.config->'adminHistory','[]'::jsonb)||jsonb_build_array(event));
  update public.fl_quote_requests set config=q.config where id=p_id;
  return jsonb_build_object('id',p_id,'action',p_action);
end; $$;
revoke all on function public.fl_repro_admin_action(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.fl_repro_admin_action(uuid,text,jsonb,text) to service_role;
commit;
