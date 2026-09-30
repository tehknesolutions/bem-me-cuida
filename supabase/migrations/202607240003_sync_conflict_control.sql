begin;
create or replace function public.sync_mood_checkin(p_record jsonb) returns text language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid := (p_record ->> 'id')::uuid; v_client_updated_at timestamptz := (p_record ->> 'client_updated_at')::timestamptz; v_existing_client_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if (p_record ->> 'user_id')::uuid <> v_user_id then raise exception 'account_scope_mismatch'; end if;
  select client_updated_at into v_existing_client_updated_at from public.mood_checkins where id = v_id and user_id = v_user_id;
  if v_existing_client_updated_at is not null and v_existing_client_updated_at > v_client_updated_at then return 'remote_newer'; end if;
  insert into public.mood_checkins (id,user_id,occurred_at,mood,anxiety,energy,irritability,agitation,impulsivity,concentration,craving,sleep_quality,sleep_minutes,note,client_updated_at,deleted_at)
  values (v_id,v_user_id,(p_record ->> 'occurred_at')::timestamptz,p_record ->> 'mood',(p_record ->> 'anxiety')::smallint,(p_record ->> 'energy')::smallint,(p_record ->> 'irritability')::smallint,(p_record ->> 'agitation')::smallint,(p_record ->> 'impulsivity')::smallint,(p_record ->> 'concentration')::smallint,(p_record ->> 'craving')::smallint,p_record ->> 'sleep_quality',case when p_record ->> 'sleep_minutes' is null then null else (p_record ->> 'sleep_minutes')::smallint end,nullif(p_record ->> 'note',''),v_client_updated_at,case when p_record ->> 'deleted_at' is null then null else (p_record ->> 'deleted_at')::timestamptz end)
  on conflict (id) do update set occurred_at=excluded.occurred_at,mood=excluded.mood,anxiety=excluded.anxiety,energy=excluded.energy,irritability=excluded.irritability,agitation=excluded.agitation,impulsivity=excluded.impulsivity,concentration=excluded.concentration,craving=excluded.craving,sleep_quality=excluded.sleep_quality,sleep_minutes=excluded.sleep_minutes,note=excluded.note,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now())
  where public.mood_checkins.user_id=v_user_id and public.mood_checkins.client_updated_at <= excluded.client_updated_at;
  return 'applied';
end;
$$;
revoke all on function public.sync_mood_checkin(jsonb) from public;
grant execute on function public.sync_mood_checkin(jsonb) to authenticated;
commit;
