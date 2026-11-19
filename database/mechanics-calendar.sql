-- Run after private-calendar.sql. Does not change public booking capacity.
begin;
set local search_path=public,extensions;
do $$ declare definition text;begin
 definition:=pg_get_functiondef('public.fl_private_calendar_save(uuid,text,jsonb,text,jsonb,text,text,text,text,text,text)'::regprocedure);
 if position('''mechanics''' in definition)=0 then
 if position('''repro'',''consult-joaquin'',''consult-german''' in definition)=0 then raise exception 'Unexpected calendar function: migration not applied';end if;
 definition:=replace(definition,'''repro'',''consult-joaquin'',''consult-german''','''repro'',''consult-joaquin'',''consult-german'',''mechanics''');
 execute definition;
 end if;
end;$$;
-- Retain the current exclusion predicate and exempt only the internal mechanics calendar.
do $$ declare definition text;begin
 select pg_get_constraintdef(oid) into definition from pg_constraint
 where conrelid='public.fl_repro_bookings'::regclass and conname='fl_booking_resource_overlap';
 if definition is null then raise exception 'Calendar capacity constraint not found';end if;
 if position('mechanics' in definition)=0 then
 definition:=regexp_replace(definition,'WHERE \((.*)\)$','WHERE ((\1) AND resource <> ''mechanics'')');
 if position('mechanics' in definition)=0 then raise exception 'Unexpected capacity constraint';end if;
 alter table public.fl_repro_bookings drop constraint fl_booking_resource_overlap;
 execute 'alter table public.fl_repro_bookings add constraint fl_booking_resource_overlap '||definition;
 end if;
end;$$;
commit;
