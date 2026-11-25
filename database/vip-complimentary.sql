begin;
create table if not exists public.fl_vip_gifts (
 user_id uuid not null references public.fl_vip_profiles(id),
 mode text not null check(mode in ('live','test')),
 plan text not null check(plan in ('essential','performance','elite')),
 expires_at timestamptz not null,
 revoked boolean not null default false,
 note text not null,
 updated_at timestamptz not null default now(),
 primary key(user_id,mode)
);
alter table public.fl_vip_gifts enable row level security;
revoke all on public.fl_vip_gifts from public,anon,authenticated;
grant all on public.fl_vip_gifts to service_role;
create or replace function public.fl_vip_gift_grant(p_user uuid,p_mode text,p_plan text,p_until timestamptz,p_note text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships;
begin
 if p_mode not in ('live','test') or p_plan not in ('essential','performance','elite') or p_until<=now() or p_until>now()+interval '10 years' or length(trim(p_note)) not between 3 and 500 then raise exception 'Invalid gift';end if;
 insert into fl_vip_memberships(user_id,mode) values(p_user,p_mode) on conflict do nothing;
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if m.risk or m.status in ('active','trialing','past_due','unpaid','paused') or m.checkout_expires>now() then raise exception 'Existing subscription or checkout';end if;
 insert into fl_vip_gifts(user_id,mode,plan,expires_at,note) values(p_user,p_mode,p_plan,p_until,trim(p_note)) on conflict(user_id,mode) do update set plan=excluded.plan,expires_at=excluded.expires_at,note=excluded.note,revoked=false,updated_at=now();
end;$$;
create or replace function public.fl_vip_redeem(p_user uuid,p_mode text,p_points integer,p_invoice text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships; balance integer;
begin
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found or m.risk then raise exception 'Membership not active';end if;
 if not coalesce(m.status='active' and m.paid_until>now(),false) and not exists(select 1 from fl_vip_gifts where user_id=p_user and mode=p_mode and not revoked and expires_at>now()) then raise exception 'Membership not active';end if;
 if p_points not between 1 and 100 or length(trim(coalesce(p_invoice,''))) not between 1 and 120 then raise exception 'Invalid redemption';end if;
 select coalesce(sum(delta),0) into balance from fl_vip_points where user_id=p_user and mode=p_mode;
 if balance<p_points then raise exception 'Insufficient points';end if;
 insert into fl_vip_points(user_id,mode,delta,kind,source,workshop_invoice) values(p_user,p_mode,-p_points,'redemption','redemption:'||p_mode||':'||p_user||':'||trim(p_invoice),trim(p_invoice));
 return jsonb_build_object('balance',balance-p_points);
end;$$;
create or replace function public.fl_vip_checkout_claim(p_user uuid,p_mode text,p_plan text,p_period text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships;
begin
 insert into fl_vip_memberships(user_id,mode) values(p_user,p_mode) on conflict do nothing;
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if m.status in ('active','trialing','past_due','unpaid','paused') or exists(select 1 from fl_vip_gifts where user_id=p_user and mode=p_mode and not revoked and expires_at>now()) then raise exception 'Existing subscription or gift';end if;
 if m.checkout_expires>now() then
  if m.plan<>p_plan or m.period<>p_period then raise exception 'Checkout already in progress';end if;
 else
  update fl_vip_memberships set checkout_attempt=gen_random_uuid(),checkout_expires=now()+interval '31 minutes',session_id=null,subscription_id=null,plan=p_plan,period=p_period where user_id=p_user and mode=p_mode returning * into m;
 end if;
 return to_jsonb(m);
end;$$;
create or replace function public.fl_vip_claim(p_user uuid,p_mode text,p_kind text,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships; g fl_vip_gifts; year_number integer;
begin
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found or m.risk then raise exception 'Invalid claim';end if;
 if m.status='active' and m.paid_until>now() then
  if m.plan<>'elite' then raise exception 'Elite required';end if;
  year_number:=extract(year from age(now(),m.first_paid_at))::integer;
 else
  select * into g from fl_vip_gifts where user_id=p_user and mode=p_mode;
  if not found or g.revoked or g.expires_at<=now() or g.plan<>'elite' then raise exception 'Elite required';end if;
  year_number:=extract(year from now())::integer;
 end if;
 if p_kind not in ('inspection','physical-card') or length(trim(coalesce(p_note,'')))<1 then raise exception 'Invalid claim';end if;
 if p_kind='physical-card' then year_number:=0;end if;
 insert into fl_vip_claims(user_id,mode,kind,period,note) values(p_user,p_mode,p_kind,year_number,left(p_note,500));
end;$$;
revoke all on function public.fl_vip_gift_grant(uuid,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.fl_vip_gift_grant(uuid,text,text,timestamptz,text) to service_role;
commit;
