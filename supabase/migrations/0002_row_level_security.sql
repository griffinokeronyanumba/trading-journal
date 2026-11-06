-- =====================================================================
-- 0002 · Row Level Security
-- Every table: RLS on, the anon role gets nothing, and signed-in users can
-- only see and change rows where user_id is their own auth.uid().
-- (select auth.uid()) is wrapped in a sub-select so Postgres evaluates it
-- once per query rather than once per row.
-- =====================================================================

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

create policy "profiles: read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Profiles are created by the sign-up trigger, never directly by the app.

do $$
declare t text;
begin
  foreach t in array array[
    'trading_accounts','instruments','trading_sessions','trade_grades','strategies','setup_types',
    'confluences','mistake_tags','strategy_rules','strategy_confluences','strategy_sessions',
    'trades','trade_confluences','trade_mistakes','trade_rule_checks','trade_screenshots',
    'reviews','review_mistakes','review_trades'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format($p$create policy "own rows" on public.%I for all to authenticated
                     using (user_id = (select auth.uid()))
                     with check (user_id = (select auth.uid()))$p$, t);
  end loop;
end $$;
