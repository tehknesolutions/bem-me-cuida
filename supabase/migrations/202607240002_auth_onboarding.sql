begin;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id, display_name) values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')) on conflict (id) do nothing; return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles (id, display_name) select id, nullif(trim(coalesce(raw_user_meta_data ->> 'display_name', '')), '') from auth.users on conflict (id) do nothing;
create or replace function public.complete_onboarding(p_display_name text, p_consents jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_display_name text := trim(p_display_name);
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(v_display_name) < 2 or char_length(v_display_name) > 80 then raise exception 'invalid_display_name'; end if;
  if jsonb_typeof(p_consents) <> 'array' then raise exception 'invalid_consents_payload'; end if;
  if not exists (select 1 from jsonb_to_recordset(p_consents) as c(document_type text, document_version text, granted boolean) where c.document_type = 'terms' and c.granted is true)
    or not exists (select 1 from jsonb_to_recordset(p_consents) as c(document_type text, document_version text, granted boolean) where c.document_type = 'privacy' and c.granted is true)
    or not exists (select 1 from jsonb_to_recordset(p_consents) as c(document_type text, document_version text, granted boolean) where c.document_type = 'health_data' and c.granted is true)
  then raise exception 'required_consents_missing'; end if;
  insert into public.profiles (id, display_name, onboarding_completed_at) values (v_user_id, v_display_name, timezone('utc', now())) on conflict (id) do update set display_name = excluded.display_name, onboarding_completed_at = excluded.onboarding_completed_at, updated_at = timezone('utc', now());
  insert into public.user_consents (user_id, document_type, document_version, granted, granted_at, revoked_at)
  select v_user_id, c.document_type, c.document_version, c.granted, timezone('utc', now()), case when c.granted then null else timezone('utc', now()) end
  from jsonb_to_recordset(p_consents) as c(document_type text, document_version text, granted boolean)
  where c.document_type in ('terms','privacy','health_data','analytics','ai_processing')
  on conflict (user_id, document_type, document_version) do update set granted = excluded.granted, granted_at = excluded.granted_at, revoked_at = excluded.revoked_at;
end;
$$;
revoke all on function public.complete_onboarding(text, jsonb) from public;
grant execute on function public.complete_onboarding(text, jsonb) to authenticated;
commit;
