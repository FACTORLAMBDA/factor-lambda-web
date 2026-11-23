begin;
create table if not exists public.fl_vip_profiles(
 id uuid primary key references auth.users(id),email text not null,name text not null default '',phone text not null default '',
 code text not null unique default ('FL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 referrer_id uuid references public.fl_vip_profiles(id),created_at timestamptz not null default now(),check(referrer_id is distinct from id));
create table if not exists public.fl_vip_cars(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.fl_vip_profiles(id),
 make text not null,model text not null,plate text not null default '',modifications text not null default '',created_at timestamptz not null default now());
alter table public.fl_vip_profiles add column if not exists dni_cipher text;
alter table public.fl_vip_profiles add column if not exists dni_hash text unique;
create table if not exists public.fl_vip_memberships(
 user_id uuid not null references public.fl_vip_profiles(id),mode text not null check(mode in ('live','test')),
 customer_id text unique,subscription_id text unique,session_id text,checkout_attempt uuid,checkout_expires timestamptz,
 plan text check(plan in ('essential','performance','elite')),period text check(period in ('monthly','annual')),
 status text not null default 'inactive',paid_until timestamptz,first_paid_at timestamptz,cancel_at_period_end boolean not null default false,
 risk boolean not null default false,welcome_sent boolean not null default false,updated_at timestamptz not null default now(),primary key(user_id,mode));
create table if not exists public.fl_vip_invoices(
 id text primary key,user_id uuid not null,mode text not null,subscription_id text not null,amount_cents integer not null,
 paid_at timestamptz not null,revoked boolean not null default false,foreign key(user_id,mode) references public.fl_vip_memberships(user_id,mode));
create table if not exists public.fl_vip_points(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.fl_vip_profiles(id),mode text not null,
 delta integer not null,kind text not null,source text not null unique,invoice_id text references public.fl_vip_invoices(id),
 workshop_invoice text,created_at timestamptz not null default now());
create table if not exists public.fl_vip_claims(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,mode text not null,kind text not null,period integer not null default 0,
 note text not null,created_at timestamptz not null default now(),unique(user_id,mode,kind,period),foreign key(user_id,mode) references public.fl_vip_memberships(user_id,mode));
create table if not exists public.fl_vip_throttle(key text primary key,last_at timestamptz not null);
create or replace function public.fl_vip_balances(p_users uuid[],p_mode text)
returns table(user_id uuid,balance bigint) language sql security definer set search_path=public,pg_temp as $$
select p.user_id,sum(p.delta) from fl_vip_points p where p.user_id=any(p_users) and p.mode=p_mode group by p.user_id;
$$;
revoke all on function public.fl_vip_balances(uuid[],text) from public,anon,authenticated;
grant execute on function public.fl_vip_balances(uuid[],text) to service_role;
alter table public.fl_vip_profiles enable row level security;
alter table public.fl_vip_cars enable row level security;
alter table public.fl_vip_memberships enable row level security;
alter table public.fl_vip_invoices enable row level security;
alter table public.fl_vip_points enable row level security;
alter table public.fl_vip_claims enable row level security;
alter table public.fl_vip_throttle enable row level security;
revoke all on public.fl_vip_profiles,public.fl_vip_cars,public.fl_vip_memberships,public.fl_vip_invoices,public.fl_vip_points,public.fl_vip_claims,public.fl_vip_throttle from public,anon,authenticated;
grant all on public.fl_vip_profiles,public.fl_vip_cars,public.fl_vip_memberships,public.fl_vip_invoices,public.fl_vip_points,public.fl_vip_claims,public.fl_vip_throttle to service_role;

create or replace function public.fl_vip_rate_limit(p_key text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into fl_vip_throttle(key,last_at) values(p_key,now()) on conflict(key) do update set last_at=now() where fl_vip_throttle.last_at<now()-interval '60 seconds';
 return found;
end;$$;
create or replace function public.fl_vip_checkout_claim(p_user uuid,p_mode text,p_plan text,p_period text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships;
begin
 insert into fl_vip_memberships(user_id,mode) values(p_user,p_mode) on conflict do nothing;
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if m.status in ('active','trialing','past_due','unpaid','paused') then raise exception 'Existing subscription';end if;
 if m.checkout_expires>now() then
 if m.plan<>p_plan or m.period<>p_period then raise exception 'Checkout already in progress';end if;
 else
 update fl_vip_memberships set checkout_attempt=gen_random_uuid(),checkout_expires=now()+interval '31 minutes',session_id=null,subscription_id=null,plan=p_plan,period=p_period where user_id=p_user and mode=p_mode returning * into m;
 end if;
 return to_jsonb(m);
end;$$;

create or replace function public.fl_vip_paid(p_invoice text,p_user uuid,p_mode text,p_subscription text,p_amount integer,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships; sponsor uuid; first_payment boolean;
begin
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found or m.subscription_id is distinct from p_subscription or p_amount<=0 then raise exception 'Invalid VIP invoice';end if;
 insert into fl_vip_invoices(id,user_id,mode,subscription_id,amount_cents,paid_at) values(p_invoice,p_user,p_mode,p_subscription,p_amount,now()) on conflict do nothing;
 if not found then return to_jsonb(m);end if;
 first_payment:=m.first_paid_at is null;
 update fl_vip_memberships set first_paid_at=coalesce(first_paid_at,now()),paid_until=greatest(paid_until,p_until),updated_at=now() where user_id=p_user and mode=p_mode returning * into m;
 if first_payment then
 insert into fl_vip_points(user_id,mode,delta,kind,source,invoice_id) values(p_user,p_mode,2,'welcome','welcome:'||p_mode||':'||p_user,p_invoice) on conflict do nothing;
 select referrer_id into sponsor from fl_vip_profiles where id=p_user;
 if sponsor is not null and exists(select 1 from fl_vip_memberships where user_id=sponsor and mode=p_mode and status='active' and paid_until>now() and not risk) then
 insert into fl_vip_points(user_id,mode,delta,kind,source,invoice_id) values(sponsor,p_mode,1,'referral','referral:'||p_mode||':'||p_user,p_invoice) on conflict do nothing;
 end if;
 end if;
 return to_jsonb(m);
end;$$;
create or replace function public.fl_vip_revoke_invoice(p_invoice text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update fl_vip_invoices set revoked=true where id=p_invoice and not revoked;
 if not found then return;end if;
 insert into fl_vip_points(user_id,mode,delta,kind,source,invoice_id)
 select user_id,mode,-delta,'reversal','reversal:'||id,p_invoice from fl_vip_points where invoice_id=p_invoice and kind in ('welcome','referral') on conflict do nothing;
 update fl_vip_memberships m set risk=true where exists(select 1 from fl_vip_invoices i where i.id=p_invoice and i.user_id=m.user_id and i.mode=m.mode);
end;$$;
create or replace function public.fl_vip_redeem(p_user uuid,p_mode text,p_points integer,p_invoice text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships; balance integer;
begin
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found or m.status<>'active' or m.risk or m.paid_until<=now() then raise exception 'Membership not active';end if;
 if p_points not between 1 and 100 or length(trim(coalesce(p_invoice,''))) not between 1 and 120 then raise exception 'Invalid redemption';end if;
 select coalesce(sum(delta),0) into balance from fl_vip_points where user_id=p_user and mode=p_mode;
 if balance<p_points then raise exception 'Insufficient points';end if;
 insert into fl_vip_points(user_id,mode,delta,kind,source,workshop_invoice) values(p_user,p_mode,-p_points,'redemption','redemption:'||p_mode||':'||p_user||':'||trim(p_invoice),trim(p_invoice));
 return jsonb_build_object('balance',balance-p_points);
end;$$;
create or replace function public.fl_vip_claim(p_user uuid,p_mode text,p_kind text,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare m fl_vip_memberships; year_number integer;
begin
 select * into m from fl_vip_memberships where user_id=p_user and mode=p_mode for update;
 if not found or m.plan<>'elite' or m.status<>'active' or m.risk or m.paid_until<=now() or p_kind not in ('inspection','physical-card') or length(trim(coalesce(p_note,'')))<1 then raise exception 'Invalid claim';end if;
 year_number:=case when p_kind='physical-card' then 0 else extract(year from age(now(),m.first_paid_at))::integer end;
 insert into fl_vip_claims(user_id,mode,kind,period,note) values(p_user,p_mode,p_kind,year_number,left(p_note,500));
end;$$;
revoke all on function public.fl_vip_rate_limit(text),public.fl_vip_checkout_claim(uuid,text,text,text),public.fl_vip_paid(text,uuid,text,text,integer,timestamptz),public.fl_vip_revoke_invoice(text),public.fl_vip_redeem(uuid,text,integer,text),public.fl_vip_claim(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fl_vip_rate_limit(text),public.fl_vip_checkout_claim(uuid,text,text,text),public.fl_vip_paid(text,uuid,text,text,integer,timestamptz),public.fl_vip_revoke_invoice(text),public.fl_vip_redeem(uuid,text,integer,text),public.fl_vip_claim(uuid,text,text,text) to service_role;
commit;
