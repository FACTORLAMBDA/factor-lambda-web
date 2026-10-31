-- Execute once in a private Supabase project before enabling QUOTES_ENABLED.
create table if not exists public.fl_quote_requests (
  id uuid primary key default gen_random_uuid(),
  version uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','send_failed','paid')),
  customer jsonb not null,
  vehicle jsonb not null,
  config jsonb not null,
  base_cents integer check (base_cents > 0),
  total_cents integer,
  delivery jsonb not null default '{}',
  stripe_session_id text,
  stripe_mode text check (stripe_mode = 'test'),
  notification_status text not null default 'pending' check (notification_status in ('pending','sending','sent')),
  check ((base_cents is null and total_cents is null) or total_cents = base_cents + case when config->>'dyno' = 'true' then 5000 else 0 end)
);
alter table public.fl_quote_requests enable row level security;
revoke all on public.fl_quote_requests from anon, authenticated;
create index if not exists fl_quote_requests_created_idx on public.fl_quote_requests(created_at desc);
-- Existing installations: add the mode marker without changing previous orders.
alter table public.fl_quote_requests add column if not exists stripe_mode text check (stripe_mode = 'test');
