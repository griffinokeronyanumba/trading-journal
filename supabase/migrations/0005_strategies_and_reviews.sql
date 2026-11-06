-- =====================================================================
-- 0005 · Atomic saves for strategies and reviews
--   save_strategy(p) : strategy + rules + required confluences + preferred sessions
--   save_review(p)   : review + tagged mistakes + best/worst trades
-- Both run with the caller's permissions (RLS applies) and are all-or-nothing.
-- =====================================================================

-- p = { "strategy": {id?, name, description, entry_conditions, exit_rules, notes, is_active},
--       "rules": [{id?, rule_text}], "confluence_ids": [uuid], "session_ids": [uuid] }
-- Rules are matched by id so existing rule checks on trades are preserved;
-- rules removed from the list are deleted (with their checks).
create or replace function public.save_strategy(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id   uuid := nullif(p #>> '{strategy,id}', '')::uuid;
  s      public.strategies;
  keep   uuid[] := '{}';
  rule   jsonb;
  r_id   uuid;
  i      int := 0;
begin
  s := jsonb_populate_record(null::public.strategies, p -> 'strategy');

  if v_id is null then
    insert into public.strategies (name, description, entry_conditions, exit_rules, notes, is_active)
    values (s.name, s.description, s.entry_conditions, s.exit_rules, s.notes, coalesce(s.is_active, true))
    returning id into v_id;
  else
    update public.strategies t set
      name = s.name, description = s.description, entry_conditions = s.entry_conditions,
      exit_rules = s.exit_rules, notes = s.notes, is_active = coalesce(s.is_active, true)
    where t.id = v_id;
    if not found then raise exception 'Strategy not found' using errcode = 'P0002'; end if;
  end if;

  for rule in select * from jsonb_array_elements(coalesce(p -> 'rules', '[]')) loop
    r_id := nullif(rule ->> 'id', '')::uuid;
    if r_id is not null then
      update public.strategy_rules set rule_text = rule ->> 'rule_text', sort_order = i
      where id = r_id and strategy_id = v_id;
      if not found then r_id := null; end if;
    end if;
    if r_id is null then
      insert into public.strategy_rules (strategy_id, rule_text, sort_order)
      values (v_id, rule ->> 'rule_text', i) returning id into r_id;
    end if;
    keep := keep || r_id;
    i := i + 1;
  end loop;
  delete from public.strategy_rules where strategy_id = v_id and not (id = any(keep));

  delete from public.strategy_confluences where strategy_id = v_id;
  insert into public.strategy_confluences (strategy_id, confluence_id)
    select v_id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'confluence_ids', '[]')) x;

  delete from public.strategy_sessions where strategy_id = v_id;
  insert into public.strategy_sessions (strategy_id, session_id)
    select v_id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'session_ids', '[]')) x;

  return v_id;
end;
$$;

-- p = { "review": {account_id|null, period, period_start, period_end, summary, went_well, went_wrong,
--                   lessons, strategy_effectiveness, improvement_areas, objectives},
--       "mistake_ids": [uuid], "best_trade_ids": [uuid], "worst_trade_ids": [uuid] }
-- One review per (account, period, start date): saving again updates it.
create or replace function public.save_review(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r     public.reviews;
  v_id  uuid;
begin
  r := jsonb_populate_record(null::public.reviews, p -> 'review');

  select id into v_id from public.reviews
  where user_id = (select auth.uid())
    and account_id is not distinct from r.account_id
    and period = r.period
    and period_start = r.period_start;

  if v_id is null then
    insert into public.reviews (account_id, period, period_start, period_end, summary, went_well, went_wrong,
                                lessons, strategy_effectiveness, improvement_areas, objectives)
    values (r.account_id, r.period, r.period_start, r.period_end, r.summary, r.went_well, r.went_wrong,
            r.lessons, r.strategy_effectiveness, r.improvement_areas, r.objectives)
    returning id into v_id;
  else
    update public.reviews set
      period_end = r.period_end, summary = r.summary, went_well = r.went_well, went_wrong = r.went_wrong,
      lessons = r.lessons, strategy_effectiveness = r.strategy_effectiveness,
      improvement_areas = r.improvement_areas, objectives = r.objectives
    where id = v_id;
  end if;

  delete from public.review_mistakes where review_id = v_id;
  insert into public.review_mistakes (review_id, mistake_tag_id)
    select v_id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'mistake_ids', '[]')) x;

  delete from public.review_trades where review_id = v_id;
  insert into public.review_trades (review_id, trade_id, role)
    select v_id, x::uuid, 'best' from jsonb_array_elements_text(coalesce(p -> 'best_trade_ids', '[]')) x;
  insert into public.review_trades (review_id, trade_id, role)
    select v_id, x::uuid, 'worst' from jsonb_array_elements_text(coalesce(p -> 'worst_trade_ids', '[]')) x
    on conflict (review_id, trade_id) do nothing;

  return v_id;
end;
$$;

revoke execute on function public.save_strategy(jsonb) from public, anon;
revoke execute on function public.save_review(jsonb) from public, anon;
grant execute on function public.save_strategy(jsonb) to authenticated;
grant execute on function public.save_review(jsonb) to authenticated;
