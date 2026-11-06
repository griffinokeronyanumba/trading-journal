-- =====================================================================
-- 0006 · Bulk import
-- import_trades(p) takes an array of save_trade() payloads and saves them
-- in ONE transaction: if any row fails, nothing is imported.
-- =====================================================================
create or replace function public.import_trades(p jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  n    integer := 0;
begin
  if jsonb_typeof(p) <> 'array' then
    raise exception 'Expected an array of trades' using errcode = '22023';
  end if;
  if jsonb_array_length(p) > 2000 then
    raise exception 'Import at most 2000 trades at a time' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p) loop
    if item #>> '{trade,id}' is not null then
      raise exception 'Imported trades must not carry an id' using errcode = '22023';
    end if;
    perform public.save_trade(item);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.import_trades(jsonb) from public, anon;
grant execute on function public.import_trades(jsonb) to authenticated;
