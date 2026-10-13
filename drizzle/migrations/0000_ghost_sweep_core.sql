create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'user');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

create table public.bot_config (
  id int primary key default 1 check (id = 1),
  config jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table public.engine_status (
  id int primary key default 1 check (id = 1),
  status jsonb not null default '{}'::jsonb,
  heartbeat_at timestamptz
);
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null, market text not null, strategy text not null, side text not null,
  score numeric not null, accepted boolean not null,
  price numeric, volume_24h numeric, change_pct numeric,
  entry numeric, stop numeric, targets jsonb not null default '[]'::jsonb, rr numeric,
  factors jsonb not null default '[]'::jsonb, reasons jsonb not null default '[]'::jsonb,
  simulated boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.signals (created_at desc);
create table public.orders (
  client_order_id text primary key,
  exchange_order_id text, symbol text not null, market text not null,
  side text not null, type text not null, purpose text not null, status text not null,
  qty numeric not null, price numeric, stop_price numeric,
  filled_qty numeric not null default 0, avg_price numeric,
  reduce_only boolean not null default false, position_id text,
  simulated boolean not null default true, raw jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.positions (
  id text primary key, symbol text not null, market text not null, side text not null,
  strategy text, score numeric, qty numeric not null, entry numeric not null,
  stop numeric not null, initial_stop numeric not null, targets jsonb not null default '[]'::jsonb,
  trail jsonb, status text not null, realized_pnl numeric not null default 0,
  fees numeric not null default 0, mark numeric, unrealized_pnl numeric,
  entry_reason jsonb, exit_reason text, simulated boolean not null default true,
  opened_at timestamptz not null default now(), closed_at timestamptz
);
create table public.fills (
  id text primary key, client_order_id text, position_id text, symbol text not null,
  side text not null, qty numeric not null, price numeric not null,
  fee numeric not null default 0, realized_pnl numeric not null default 0,
  simulated boolean not null default true, ts timestamptz not null default now()
);
create table public.events (
  id bigserial primary key, level text not null, component text not null,
  message text not null, data jsonb, ts timestamptz not null default now()
);
create index on public.events (ts desc);
create table public.engine_commands (
  id bigserial primary key, command text not null, payload jsonb,
  created_by uuid, created_at timestamptz not null default now(), acked_at timestamptz
);

grant select on public.bot_config, public.engine_status, public.signals, public.orders, public.positions, public.fills, public.events, public.engine_commands to authenticated;
grant insert, update on public.bot_config to authenticated;
grant insert on public.engine_commands to authenticated;
grant usage on sequence public.engine_commands_id_seq to authenticated;
grant all on public.bot_config, public.engine_status, public.signals, public.orders, public.positions, public.fills, public.events, public.engine_commands to service_role;
grant usage on all sequences in schema public to service_role;

alter table public.bot_config enable row level security;
alter table public.engine_status enable row level security;
alter table public.signals enable row level security;
alter table public.orders enable row level security;
alter table public.positions enable row level security;
alter table public.fills enable row level security;
alter table public.events enable row level security;
alter table public.engine_commands enable row level security;

create policy "admin read" on public.bot_config for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin write" on public.bot_config for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.bot_config for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.engine_status for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.signals for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.positions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.fills for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.events for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin read" on public.engine_commands for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.engine_commands for insert to authenticated with check (public.has_role(auth.uid(),'admin') and created_by = auth.uid());

insert into public.bot_config (id, config) values (1, '{
 "mode":"paper",
 "markets":["futures"],
 "capital":{"reference":1000,"riskPerTradePct":1,"maxPositions":5,"leverage":1,"minRR":2,"minScore":65,"dailyLossPct":5,"maxSlippagePct":0.1,"maxAggregateRiskPct":5,"maxExposurePerAssetPct":30,"maxExposurePerDirectionPct":60,"feePct":0.04},
 "strategies":{"A_sweepLow":true,"B_sweepHigh":true,"C_falseBreakout":true,"D_breakout":true},
 "timeframes":{"fast":"1m","structure":"5m","context":"15m"},
 "detection":{"pivotLookback":3,"levelLookback":60,"minPenetrationAtr":0.1,"maxPenetrationAtr":1.5,"minWickRatio":0.5,"minRelVolume":1.5,"breakoutRelVolume":1.8,"breakoutCloses":2,"atrPeriod":14,"confirmBars":1},
 "filters":{"minQuoteVolume24h":50000000,"maxSpreadPct":0.05,"minAtrPct":0.15,"maxAtrPct":5,"maxSymbols":30,"blacklist":[]},
 "exits":{"trailingEnabled":true,"trailingActivateR":1,"trailingDistanceAtr":1,"closeOnInvalidation":true,"closeOnOppositeSignal":true,"partialTpPct":50},
 "staleDataMs":5000
}'::jsonb);
insert into public.engine_status (id, status) values (1, '{"online":false}'::jsonb);

alter publication supabase_realtime add table public.engine_status, public.signals, public.orders, public.positions, public.fills, public.events;