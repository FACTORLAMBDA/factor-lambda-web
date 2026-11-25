begin;
alter table public.fl_vip_points add column if not exists note text not null default '';
alter table public.fl_vip_points add column if not exists actor text not null default '';
create or replace function public.fl_vip_adjust_points(p_user uuid,p_mode text,p_expected integer,p_target integer,p_note text,p_actor text,p_operation uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare balance integer; source_key text;
begin
 if p_mode not in ('live','test') or p_target is null or p_target not between 0 and 100000 or p_expected is null or p_operation is null or length(trim(coalesce(p_note,''))) not between 3 and 500 or p_actor not in ('owner','workshop') then raise exception 'Invalid adjustment';end if;
 perform 1 from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found then raise exception 'Membership not found';end if;
 source_key:='adjustment:'||p_mode||':'||p_user||':'||p_operation;
 select coalesce(sum(delta),0) into balance from fl_vip_points where user_id=p_user and mode=p_mode;
 if exists(select 1 from fl_vip_points where source=source_key) then return jsonb_build_object('balance',balance);end if;
 if balance<>p_expected then raise exception 'Balance changed';end if;
 if balance<>p_target then
 insert into fl_vip_points(user_id,mode,delta,kind,source,note,actor) values(p_user,p_mode,p_target-balance,'adjustment',source_key,trim(p_note),p_actor);
 end if;
 return jsonb_build_object('balance',p_target);
end;$$;
revoke all on function public.fl_vip_adjust_points(uuid,text,integer,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.fl_vip_adjust_points(uuid,text,integer,integer,text,text,uuid) to service_role;
commit;
