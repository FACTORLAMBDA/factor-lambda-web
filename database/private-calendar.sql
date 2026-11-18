-- Install after consultation-bookings.sql. Public booking policies are unchanged.
begin;
create or replace function public.fl_private_calendar_list(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '63 days' then raise exception 'Invalid range';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
 'id',q.id,'status',q.status,'customer',q.customer,'vehicle',q.vehicle,'config',q.config,
 'total_cents',q.total_cents,'stripe_mode',q.stripe_mode,'stripe_session_id',q.stripe_session_id,
 'notification_status',q.notification_status,'booking_state',b.state,'resource',b.resource,
 'starts_at',b.starts_at,'ends_at',b.ends_at,
 'revision',coalesce(q.config->>'calendarRevision',q.config->'appointment'->>'start')) order by b.starts_at)
 from public.fl_repro_bookings b join public.fl_quote_requests q on q.id=b.quote_id
 where b.starts_at<p_to and b.ends_at>p_from and coalesce(q.config->>'adminArchived','false')<>'true'),'[]'::jsonb);
end;$$;

create or replace function public.fl_private_calendar_save(
 p_id uuid,p_expected text,p_appointment jsonb,p_title text,p_customer jsonb,p_vehicle text,p_notes text,
 p_resource text,p_mode text,p_reason text,p_actor text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests;b public.fl_repro_bookings;s timestamptz;e timestamptz;ls timestamp;le timestamp;previous jsonb;revision text:=gen_random_uuid()::text;manual boolean;
begin
 s:=(p_appointment->>'start')::timestamptz;e:=(p_appointment->>'end')::timestamptz;
 ls:=s at time zone 'Europe/Madrid';le:=e at time zone 'Europe/Madrid';
 if s is null or e is null or e<=s or e-s>interval '31 days' or extract(second from s)<>0 or extract(second from e)<>0
 or p_title is null or length(trim(p_title))=0 or length(p_title)>160 or length(p_notes)>2000
 or p_reason is null or length(trim(p_reason))=0 or p_mode not in ('live','test')
 or p_resource not in ('repro','consult-joaquin','consult-german')
 or p_appointment->>'day' is distinct from to_char(ls,'YYYY-MM-DD')
 or p_appointment->>'time' is distinct from to_char(ls,'HH24:MI')
 or p_appointment->>'endDay' is distinct from to_char(le,'YYYY-MM-DD')
 or p_appointment->>'endTime' is distinct from to_char(le,'HH24:MI')
 then raise exception 'Invalid appointment';end if;
 if p_id is null then
   insert into public.fl_quote_requests(id,version,status,customer,vehicle,config,stripe_mode)
   values(gen_random_uuid(),gen_random_uuid(),'pending',p_customer,jsonb_build_object('model',p_vehicle),
   jsonb_build_object('flow','admin-v1','serviceKind','manual','manualAppointment',true,'title',p_title,'notes',p_notes,
   'appointment',p_appointment,'durationMinutes',(extract(epoch from e-s)/60)::integer,'calendarRevision',revision),p_mode)
   returning * into q;
   insert into public.fl_repro_bookings(quote_id,stripe_mode,starts_at,ends_at,state,resource)
   values(q.id,p_mode,s,e,'confirmed',p_resource);
 else
   select * into q from public.fl_quote_requests where id=p_id for update;
   if not found then raise exception 'Not found';end if;
   select * into b from public.fl_repro_bookings where quote_id=p_id for update;
   manual:=coalesce(q.config->>'manualAppointment','false')='true';
   if b.state is distinct from 'confirmed' or q.config->>'adminCancelled'='true' or (not manual and q.status<>'paid')
   or q.config->>'adminArchived'='true' or b.stripe_mode is distinct from p_mode then raise exception 'Not editable';end if;
   if p_expected is distinct from coalesce(q.config->>'calendarRevision',q.config->'appointment'->>'start') then
     raise exception 'Concurrent modification' using errcode='40001';end if;
   previous:=jsonb_build_object('appointment',q.config->'appointment','customer',q.customer,'vehicle',q.vehicle,'resource',b.resource);
   update public.fl_repro_bookings set starts_at=s,ends_at=e,resource=p_resource where quote_id=q.id;
   q.config:=q.config||jsonb_build_object('title',p_title,'notes',p_notes,'appointment',p_appointment,
   'durationMinutes',(extract(epoch from e-s)/60)::integer,'calendarRevision',revision);
   -- Keep the original vehicle and financial fields for website payments.
   if manual then q.vehicle:=jsonb_build_object('model',p_vehicle);end if;
   q.customer:=q.customer||p_customer;
 end if;
 q.config:=jsonb_set(q.config,'{adminHistory}',coalesce(q.config->'adminHistory','[]'::jsonb)||jsonb_build_array(
 jsonb_build_object('action',case when p_id is null then 'calendar-create' else 'calendar-edit' end,'at',now(),'actor',p_actor,'reason',left(p_reason,500),'previous',previous)));
 update public.fl_quote_requests set customer=q.customer,vehicle=q.vehicle,config=q.config where id=q.id;
 return jsonb_build_object('id',q.id,'revision',revision,'message','Cita guardada. No se ha realizado ningún cobro ni devolución.');
end;$$;

create or replace function public.fl_private_calendar_cancel(p_id uuid,p_reason text,p_actor text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.fl_quote_requests;
begin
 select * into q from public.fl_quote_requests where id=p_id for update;
 if not found or q.config->>'manualAppointment' is distinct from 'true' or length(trim(coalesce(p_reason,'')))=0 then raise exception 'Invalid manual appointment';end if;
 update public.fl_repro_bookings set state='released' where quote_id=p_id;
 update public.fl_quote_requests set config=q.config||jsonb_build_object('adminCancelled',true,'calendarRevision',gen_random_uuid()::text,
 'adminHistory',coalesce(q.config->'adminHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object('action','calendar-cancel','at',now(),'actor',p_actor,'reason',left(p_reason,500)))) where id=p_id;
 return jsonb_build_object('id',p_id,'message','Cita anulada. No se ha realizado ningún reembolso.');
end;$$;
revoke all on function public.fl_private_calendar_list(timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.fl_private_calendar_save(uuid,text,jsonb,text,jsonb,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.fl_private_calendar_cancel(uuid,text,text) from public,anon,authenticated;
grant execute on function public.fl_private_calendar_list(timestamptz,timestamptz) to service_role;
grant execute on function public.fl_private_calendar_save(uuid,text,jsonb,text,jsonb,text,text,text,text,text,text) to service_role;
grant execute on function public.fl_private_calendar_cancel(uuid,text,text) to service_role;
commit;
