-- Lets Copilot run a read-only query it writes for the user's question.
--
-- SECURITY INVOKER: the query runs as the calling student, so RLS applies
-- exactly as if they ran it themselves -- it can never read anything they
-- couldn't. On top of that we hard-block private messages and system
-- schemas, allow only a single SELECT/WITH statement, cap rows, and time out
-- runaway queries.

create or replace function ai_sql(q text)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  result json;
  cleaned text := btrim(q);
begin
  if cleaned !~* '^(select|with)\s' then
    raise exception 'Only SELECT queries are allowed';
  end if;
  if strpos(rtrim(cleaned, ';'), ';') > 0 then
    raise exception 'Only a single statement is allowed';
  end if;
  -- private chats + internals are off-limits
  if cleaned ~* '(auth\.|storage\.|information_schema|pg_|\mmessages\M)' then
    raise exception 'That data is not accessible';
  end if;

  set local statement_timeout = '5s';

  execute format(
    'select coalesce(json_agg(row_to_json(t)), ''[]''::json) from (select * from ( %s ) _q limit 500) t',
    cleaned
  ) into result;

  return result;
end;
$$;

grant execute on function ai_sql(text) to authenticated;
