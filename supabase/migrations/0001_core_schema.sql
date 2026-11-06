-- =====================================================================
-- 0001 · Core schema
-- Trading Journal — tables, enums, constraints, indexes, triggers and
-- per-user default data. Row Level Security is enabled in 0002.
--
-- Conventions
--   * Every user-owned table has user_id (default auth.uid()).
--   * Every parent table has UNIQUE (id, user_id) so children can use a
--     composite foreign key: a row can never point at another user's data.
--   * Money is numeric(18,2); prices numeric(20,10). Never float.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.account_type    as enum ('backtest', 'evaluation', 'funded', 'simulated', 'live', 'other');
create type public.instrument_category as enum ('forex', 'indices', 'commodities', 'crypto', 'stocks', 'custom');
create type public.trade_direction as enum ('buy', 'sell');
create type public.trade_outcome   as enum ('win', 'loss', 'breakeven');
create type public.news_condition  as enum ('none', 'low_impact', 'medium_impact', 'high_impact', 'during_release');
create type public.pnl_source      as enum ('manual', 'calculated');
create type public.screenshot_kind as enum ('before', 'after');
create type public.review_period   as enum ('daily', 'weekly', 'monthly');
create type public.review_trade_role as enum ('best', 'worst');

-- ---------- Helpers --------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Profiles -------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) <= 80),
  timezone          text not null default 'Africa/Nairobi',
  default_currency  char(3) not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  breakeven_band_r  numeric(6,3) not null default 0.1 check (breakeven_band_r >= 0 and breakeven_band_r <= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- Trading accounts ----------------------------------------
create table public.trading_accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 80),
  account_type          public.account_type not null default 'backtest',
  currency              char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  starting_balance      numeric(18,2) not null check (starting_balance > 0),
  risk_per_trade_pct    numeric(5,2) not null default 1 check (risk_per_trade_pct > 0 and risk_per_trade_pct <= 100),
  daily_loss_limit_pct  numeric(5,2) check (daily_loss_limit_pct > 0 and daily_loss_limit_pct <= 100),
  max_drawdown_pct      numeric(5,2) check (max_drawdown_pct > 0 and max_drawdown_pct <= 100),
  opened_on             date not null default current_date,
  is_archived           boolean not null default false,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------- Instruments ---------------------------------------------
create table public.instruments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol          text not null check (symbol ~ '^[A-Z0-9._/-]{1,20}$'),
  display_name    text check (char_length(display_name) <= 80),
  category        public.instrument_category not null default 'custom',
  quote_currency  char(3) check (quote_currency ~ '^[A-Z]{3}$'),
  -- Optional contract specification. When tick_size and tick_value are both
  -- set, P&L can be calculated as: price move / tick_size * tick_value * size.
  -- tick_value is money per tick for ONE unit of position size, in quote_currency.
  contract_size   numeric(20,8) check (contract_size > 0),
  tick_size       numeric(20,10) check (tick_size > 0),
  tick_value      numeric(20,8) check (tick_value > 0),
  pip_size        numeric(20,10) check (pip_size > 0),
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, symbol)
);

-- ---------- Trading sessions (editable times) ----------------------
create table public.trading_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  -- Times are wall-clock times in the user's profile timezone.
  -- end_time < start_time means the session crosses midnight.
  start_time  time not null,
  end_time    time not null,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------- Trade grades (configurable scale) -----------------------
create table public.trade_grades (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 10),
  description  text,
  sort_order   smallint not null default 0,  -- 0 = best
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, label)
);

-- ---------- Strategies & playbook -----------------------------------
create table public.strategies (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 80),
  description       text,
  entry_conditions  text,
  exit_rules        text,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.setup_types (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  strategy_id  uuid,
  name         text not null check (char_length(name) between 1 and 80),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name),
  foreign key (strategy_id, user_id) references public.strategies (id, user_id) on delete set null (strategy_id)
);

create table public.confluences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.mistake_tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.strategy_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  strategy_id  uuid not null,
  rule_text    text not null check (char_length(rule_text) between 1 and 200),
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  foreign key (strategy_id, user_id) references public.strategies (id, user_id) on delete cascade
);

create table public.strategy_confluences (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  strategy_id    uuid not null,
  confluence_id  uuid not null,
  primary key (strategy_id, confluence_id),
  foreign key (strategy_id, user_id)   references public.strategies (id, user_id)  on delete cascade,
  foreign key (confluence_id, user_id) references public.confluences (id, user_id) on delete cascade
);

create table public.strategy_sessions (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  strategy_id  uuid not null,
  session_id   uuid not null,
  primary key (strategy_id, session_id),
  foreign key (strategy_id, user_id) references public.strategies (id, user_id)       on delete cascade,
  foreign key (session_id, user_id)  references public.trading_sessions (id, user_id) on delete cascade
);

-- ---------- Trades ---------------------------------------------------
create table public.trades (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id          uuid not null,
  instrument_id       uuid not null,
  strategy_id         uuid,
  setup_type_id       uuid,
  session_id          uuid,
  grade_id            uuid,

  -- Trade information
  trade_date          date not null,
  direction           public.trade_direction not null,
  entry_time          timestamptz,
  exit_time           timestamptz,
  entry_price         numeric(20,10) not null check (entry_price > 0),
  stop_loss           numeric(20,10) check (stop_loss > 0),
  take_profit         numeric(20,10) check (take_profit > 0),
  exit_price          numeric(20,10) check (exit_price > 0),
  position_size       numeric(20,8)  check (position_size > 0),

  -- Strategy information
  news_condition      public.news_condition not null default 'none',
  entry_reasoning     text,
  followed_rules      boolean,

  -- Financials (planned risk, gross P&L, fees and net P&L kept separate)
  risk_pct            numeric(6,3) check (risk_pct > 0 and risk_pct <= 100),
  risk_amount         numeric(18,2) check (risk_amount > 0),
  gross_pnl           numeric(18,2),
  fees                numeric(18,2) not null default 0 check (fees >= 0),
  net_pnl             numeric(18,2) generated always as (gross_pnl - fees) stored,
  pnl_source          public.pnl_source not null default 'manual',
  -- R is ALWAYS net P&L / initial planned risk.
  r_multiple          numeric(12,4) generated always as (
                        case when risk_amount > 0 and gross_pnl is not null
                             then round((gross_pnl - fees) / risk_amount, 4) end
                      ) stored,
  planned_rr          numeric(12,4) generated always as (
                        case when stop_loss is not null and take_profit is not null and stop_loss <> entry_price
                             then round(abs(take_profit - entry_price) / abs(entry_price - stop_loss), 4) end
                      ) stored,
  potential_reward    numeric(18,2) generated always as (
                        case when risk_amount > 0 and stop_loss is not null and take_profit is not null and stop_loss <> entry_price
                             then round(risk_amount * abs(take_profit - entry_price) / abs(entry_price - stop_loss), 2) end
                      ) stored,
  -- Outcome is derived (see trades_enriched); set this only to override it.
  outcome_override    public.trade_outcome,

  -- Backtesting extras
  mfe_r               numeric(10,4) check (mfe_r >= 0),
  mae_r               numeric(10,4) check (mae_r >= 0),
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (id, user_id),
  check (exit_time is null or entry_time is null or exit_time >= entry_time),
  foreign key (account_id, user_id)    references public.trading_accounts (id, user_id) on delete cascade,
  foreign key (instrument_id, user_id) references public.instruments (id, user_id)      on delete restrict,
  foreign key (strategy_id, user_id)   references public.strategies (id, user_id)       on delete set null (strategy_id),
  foreign key (setup_type_id, user_id) references public.setup_types (id, user_id)      on delete set null (setup_type_id),
  foreign key (session_id, user_id)    references public.trading_sessions (id, user_id) on delete set null (session_id),
  foreign key (grade_id, user_id)      references public.trade_grades (id, user_id)     on delete set null (grade_id)
);

create index trades_user_account_date_idx on public.trades (user_id, account_id, trade_date);
create index trades_user_date_idx        on public.trades (user_id, trade_date);
create index trades_instrument_idx       on public.trades (instrument_id);
create index trades_strategy_idx         on public.trades (strategy_id);

create table public.trade_confluences (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id       uuid not null,
  confluence_id  uuid not null,
  primary key (trade_id, confluence_id),
  foreign key (trade_id, user_id)      references public.trades (id, user_id)      on delete cascade,
  foreign key (confluence_id, user_id) references public.confluences (id, user_id) on delete cascade
);

create table public.trade_mistakes (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id        uuid not null,
  mistake_tag_id  uuid not null,
  primary key (trade_id, mistake_tag_id),
  foreign key (trade_id, user_id)       references public.trades (id, user_id)       on delete cascade,
  foreign key (mistake_tag_id, user_id) references public.mistake_tags (id, user_id) on delete cascade
);

create table public.trade_rule_checks (
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id  uuid not null,
  rule_id   uuid not null,
  followed  boolean not null,
  primary key (trade_id, rule_id),
  foreign key (trade_id, user_id) references public.trades (id, user_id)         on delete cascade,
  foreign key (rule_id, user_id)  references public.strategy_rules (id, user_id) on delete cascade
);

create index trade_mistakes_tag_idx on public.trade_mistakes (mistake_tag_id);
create index trade_confluences_conf_idx on public.trade_confluences (confluence_id);

-- ---------- Screenshots ---------------------------------------------
create table public.trade_screenshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id      uuid not null,
  kind          public.screenshot_kind not null,
  storage_path  text not null unique,
  caption       text check (char_length(caption) <= 200),
  sort_order    smallint not null default 0,
  width         integer check (width > 0),
  height        integer check (height > 0),
  size_bytes    integer check (size_bytes > 0),
  created_at    timestamptz not null default now(),
  -- The file must live in the owner's folder: {user_id}/{trade_id}/...
  check (storage_path like user_id::text || '/' || trade_id::text || '/%'),
  foreign key (trade_id, user_id) references public.trades (id, user_id) on delete cascade
);
create index trade_screenshots_trade_idx on public.trade_screenshots (trade_id);

-- ---------- Reviews --------------------------------------------------
create table public.reviews (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id              uuid,           -- null = all accounts
  period                  public.review_period not null,
  period_start            date not null,
  period_end              date not null,
  summary                 text,           -- weekly: performance summary · monthly: overall performance
  went_well               text,           -- daily
  went_wrong              text,           -- daily
  lessons                 text,           -- daily
  strategy_effectiveness  text,           -- monthly
  improvement_areas       text,           -- weekly
  objectives              text,           -- monthly
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (id, user_id),
  unique nulls not distinct (user_id, account_id, period, period_start),
  check (period_end >= period_start),
  foreign key (account_id, user_id) references public.trading_accounts (id, user_id) on delete cascade
);

create table public.review_mistakes (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  review_id       uuid not null,
  mistake_tag_id  uuid not null,
  primary key (review_id, mistake_tag_id),
  foreign key (review_id, user_id)      references public.reviews (id, user_id)      on delete cascade,
  foreign key (mistake_tag_id, user_id) references public.mistake_tags (id, user_id) on delete cascade
);

create table public.review_trades (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  review_id  uuid not null,
  trade_id   uuid not null,
  role       public.review_trade_role not null,
  primary key (review_id, trade_id),
  foreign key (review_id, user_id) references public.reviews (id, user_id) on delete cascade,
  foreign key (trade_id, user_id)  references public.trades (id, user_id)  on delete cascade
);

-- ---------- updated_at triggers -------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','trading_accounts','instruments','trading_sessions','trade_grades','strategies',
    'setup_types','confluences','mistake_tags','strategy_rules','trades','reviews'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Per-user default data ------------------------------------
-- Copies the default instruments, sessions, grades and mistake tags into a
-- user's own lists. Idempotent: safe to run more than once.
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (p_user_id) on conflict (id) do nothing;

  insert into public.instruments (user_id, symbol, display_name, category, quote_currency) values
    (p_user_id, 'XAUUSD', 'Gold / US Dollar',     'commodities', 'USD'),
    (p_user_id, 'NAS100', 'Nasdaq 100',           'indices',     'USD'),
    (p_user_id, 'US30',   'Dow Jones 30',         'indices',     'USD'),
    (p_user_id, 'EURUSD', 'Euro / US Dollar',     'forex',       'USD'),
    (p_user_id, 'GBPUSD', 'British Pound / US Dollar', 'forex',  'USD')
  on conflict (user_id, symbol) do nothing;

  -- Wall-clock times in Africa/Nairobi (UTC+3). Editable in Settings.
  insert into public.trading_sessions (user_id, name, start_time, end_time, sort_order) values
    (p_user_id, 'Asia',     '03:00', '11:00', 0),
    (p_user_id, 'London',   '10:00', '19:00', 1),
    (p_user_id, 'New York', '15:00', '23:00', 2)
  on conflict (user_id, name) do nothing;

  insert into public.trade_grades (user_id, label, description, sort_order) values
    (p_user_id, 'A+', 'Excellent execution; all rules followed.', 0),
    (p_user_id, 'A',  'Strong execution with minor imperfections.', 1),
    (p_user_id, 'B',  'Acceptable execution with noticeable weaknesses.', 2),
    (p_user_id, 'C',  'Poor execution or significant rule violations.', 3)
  on conflict (user_id, label) do nothing;

  insert into public.mistake_tags (user_id, name) values
    (p_user_id, 'Entered early'),
    (p_user_id, 'Entered late / chased'),
    (p_user_id, 'Moved stop-loss'),
    (p_user_id, 'Closed too early'),
    (p_user_id, 'Ignored the plan'),
    (p_user_id, 'Oversized position'),
    (p_user_id, 'Traded during news'),
    (p_user_id, 'Overtrading')
  on conflict (user_id, name) do nothing;
end;
$$;

revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration ran (e.g. your login) get defaults now.
do $$
declare u record;
begin
  for u in select id from auth.users loop
    perform public.seed_user_defaults(u.id);
  end loop;
end $$;
