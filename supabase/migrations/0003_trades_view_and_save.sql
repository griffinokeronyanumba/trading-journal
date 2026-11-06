-- =====================================================================
-- 0003 · Trade read model + atomic save
--   trades_enriched : one row per trade with names, derived outcome and tags
--   save_trade(p)   : insert/update a trade and its confluences, mistakes and
--                     rule checks in ONE transaction (all or nothing)
-- Both run with the caller's permissions, so Row Level Security still applies.
-- =====================================================================

create or replace view public.trades_enriched
with (security_invoker = true)
as
select
  t.*,
  a.name           as account_name,
  a.currency       as currency,
  i.symbol         as symbol,
  i.category       as instrument_category,
  s.name           as strategy_name,
  su.name          as setup_name,
  se.name          as session_name,
  g.label          as grade_label,
  g.sort_order     as grade_rank,
  coalesce(
    t.outcome_override,
    case
      when t.net_pnl is null then null
      when t.r_multiple is not null then
        case when abs(t.r_multiple) <= coalesce(p.breakeven_band_r, 0.1) then 'breakeven'
             when t.r_multiple > 0 then 'win' else 'loss' end
      when t.net_pnl > 0 then 'win'
      when t.net_pnl < 0 then 'loss'
      else 'breakeven'
    end::public.trade_outcome
  )                as outcome,
  extract(isodow from t.trade_date)::int as weekday,       -- 1 = Monday … 7 = Sunday
  to_char(t.trade_date, 'YYYY-MM')       as month,
  coalesce((select array_agg(m.mistake_tag_id order by m.mistake_tag_id) from public.trade_mistakes m where m.trade_id = t.id), '{}') as mistake_ids,
  coalesce((select array_agg(c.confluence_id order by c.confluence_id) from public.trade_confluences c where c.trade_id = t.id), '{}') as confluence_ids,
  (select count(*) from public.trade_rule_checks rc where rc.trade_id = t.id)::int                    as rules_checked,
  (select count(*) from public.trade_rule_checks rc where rc.trade_id = t.id and not rc.followed)::int as rules_broken
from public.trades t
join public.trading_accounts a on a.id = t.account_id
join public.instruments i      on i.id = t.instrument_id
left join public.strategies s       on s.id = t.strategy_id
left join public.setup_types su     on su.id = t.setup_type_id
left join public.trading_sessions se on se.id = t.session_id
left join public.trade_grades g     on g.id = t.grade_id
left join public.profiles p         on p.id = t.user_id;

revoke all on public.trades_enriched from anon;
grant select on public.trades_enriched to authenticated;

-- ---------------------------------------------------------------------
-- p = {
--   "trade": { "id"?: uuid, ...trade columns },
--   "confluence_ids": [uuid], "mistake_ids": [uuid],
--   "rule_checks": [{ "rule_id": uuid, "followed": bool }]
-- }
-- ---------------------------------------------------------------------
create or replace function public.save_trade(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id  uuid := nullif(p #>> '{trade,id}', '')::uuid;
  r     public.trades;
begin
  r := jsonb_populate_record(null::public.trades, p -> 'trade');

  if v_id is null then
    insert into public.trades (
      account_id, instrument_id, strategy_id, setup_type_id, session_id, grade_id,
      trade_date, direction, entry_time, exit_time, entry_price, stop_loss, take_profit, exit_price, position_size,
      news_condition, entry_reasoning, followed_rules, risk_pct, risk_amount, gross_pnl, fees, pnl_source,
      outcome_override, mfe_r, mae_r, notes)
    values (
      r.account_id, r.instrument_id, r.strategy_id, r.setup_type_id, r.session_id, r.grade_id,
      r.trade_date, r.direction, r.entry_time, r.exit_time, r.entry_price, r.stop_loss, r.take_profit, r.exit_price, r.position_size,
      coalesce(r.news_condition, 'none'), r.entry_reasoning, r.followed_rules, r.risk_pct, r.risk_amount, r.gross_pnl,
      coalesce(r.fees, 0), coalesce(r.pnl_source, 'manual'), r.outcome_override, r.mfe_r, r.mae_r, r.notes)
    returning id into v_id;
  else
    update public.trades t set
      account_id = r.account_id, instrument_id = r.instrument_id, strategy_id = r.strategy_id,
      setup_type_id = r.setup_type_id, session_id = r.session_id, grade_id = r.grade_id,
      trade_date = r.trade_date, direction = r.direction, entry_time = r.entry_time, exit_time = r.exit_time,
      entry_price = r.entry_price, stop_loss = r.stop_loss, take_profit = r.take_profit, exit_price = r.exit_price,
      position_size = r.position_size, news_condition = coalesce(r.news_condition, 'none'),
      entry_reasoning = r.entry_reasoning, followed_rules = r.followed_rules, risk_pct = r.risk_pct,
      risk_amount = r.risk_amount, gross_pnl = r.gross_pnl, fees = coalesce(r.fees, 0),
      pnl_source = coalesce(r.pnl_source, 'manual'), outcome_override = r.outcome_override,
      mfe_r = r.mfe_r, mae_r = r.mae_r, notes = r.notes
    where t.id = v_id;
    if not found then
      raise exception 'Trade not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.trade_confluences where trade_id = v_id;
  insert into public.trade_confluences (trade_id, confluence_id)
    select v_id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'confluence_ids', '[]')) x;

  delete from public.trade_mistakes where trade_id = v_id;
  insert into public.trade_mistakes (trade_id, mistake_tag_id)
    select v_id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'mistake_ids', '[]')) x;

  delete from public.trade_rule_checks where trade_id = v_id;
  insert into public.trade_rule_checks (trade_id, rule_id, followed)
    select v_id, (x ->> 'rule_id')::uuid, (x ->> 'followed')::boolean
    from jsonb_array_elements(coalesce(p -> 'rule_checks', '[]')) x;

  return v_id;
end;
$$;

revoke execute on function public.save_trade(jsonb) from public, anon;
grant execute on function public.save_trade(jsonb) to authenticated;
