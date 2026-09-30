begin;

create or replace function public.pull_mood_checkins(
  p_cursor_updated_at timestamptz default '1970-01-01 00:00:00+00',
  p_cursor_id uuid default '00000000-0000-0000-0000-000000000000',
  p_limit integer default 500
)
returns setof public.mood_checkins
language sql
stable
security invoker
set search_path = ''
as $$
  select item.*
  from public.mood_checkins as item
  where item.user_id = (select auth.uid())
    and (
      item.updated_at > coalesce(p_cursor_updated_at, '1970-01-01 00:00:00+00'::timestamptz)
      or (
        item.updated_at = coalesce(p_cursor_updated_at, '1970-01-01 00:00:00+00'::timestamptz)
        and item.id > coalesce(p_cursor_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    )
  order by item.updated_at asc, item.id asc
  limit least(greatest(coalesce(p_limit, 500), 1), 500);
$$;

revoke all on function public.pull_mood_checkins(timestamptz, uuid, integer) from public;
grant execute on function public.pull_mood_checkins(timestamptz, uuid, integer) to authenticated;

commit;
