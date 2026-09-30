begin;

create table public.support_plans (
  id uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  warning_signs jsonb not null default '[]'::jsonb check (jsonb_typeof(warning_signs) = 'array'),
  immediate_actions jsonb not null default '[]'::jsonb check (jsonb_typeof(immediate_actions) = 'array'),
  safe_places jsonb not null default '[]'::jsonb check (jsonb_typeof(safe_places) = 'array'),
  important_reminder text check (important_reminder is null or char_length(important_reminder) <= 500),
  grounding_reminder text check (grounding_reminder is null or char_length(grounding_reminder) <= 500),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.support_contacts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  relationship text check (relationship is null or char_length(relationship) <= 80),
  phone text not null check (char_length(phone) between 3 and 40),
  availability_notes text check (availability_notes is null or char_length(availability_notes) <= 240),
  priority smallint not null default 3 check (priority between 1 and 5),
  active boolean not null default true,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(id, user_id)
);

create index support_contacts_user_priority_idx on public.support_contacts(user_id, active, priority, name) where deleted_at is null;
create trigger support_plans_updated_at before update on public.support_plans for each row execute function public.set_updated_at();
create trigger support_contacts_updated_at before update on public.support_contacts for each row execute function public.set_updated_at();
alter table public.support_plans enable row level security;
alter table public.support_contacts enable row level security;
create policy "support_plans_select_own" on public.support_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "support_plans_insert_own" on public.support_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "support_plans_update_own" on public.support_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "support_plans_delete_own" on public.support_plans for delete to authenticated using ((select auth.uid()) = user_id);
create policy "support_contacts_select_own" on public.support_contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy "support_contacts_insert_own" on public.support_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "support_contacts_update_own" on public.support_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "support_contacts_delete_own" on public.support_contacts for delete to authenticated using ((select auth.uid()) = user_id);

alter function public.sync_care_record(text, jsonb) rename to sync_care_record_v3;
alter function public.pull_care_records(text, timestamptz, uuid, integer) rename to pull_care_records_v3;

create or replace function public.sync_care_record(p_entity_type text, p_record jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid := (p_record ->> 'id')::uuid; v_client_updated_at timestamptz := (p_record ->> 'updatedAt')::timestamptz; v_existing timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if (p_record ->> 'userId')::uuid <> v_user_id then raise exception 'account_scope_mismatch'; end if;
  if p_entity_type not in ('support_plan','support_contact') then return public.sync_care_record_v3(p_entity_type,p_record); end if;
  if p_entity_type = 'support_plan' then
    select client_updated_at into v_existing from public.support_plans where user_id=v_user_id;
    if v_existing is not null and v_existing > v_client_updated_at then return 'remote_newer'; end if;
    insert into public.support_plans(id,user_id,warning_signs,immediate_actions,safe_places,important_reminder,grounding_reminder,client_updated_at,created_at,deleted_at)
    values(v_id,v_user_id,coalesce(p_record->'warningSigns','[]'::jsonb),coalesce(p_record->'immediateActions','[]'::jsonb),coalesce(p_record->'safePlaces','[]'::jsonb),nullif(p_record->>'importantReminder',''),nullif(p_record->>'groundingReminder',''),v_client_updated_at,coalesce((p_record->>'createdAt')::timestamptz,timezone('utc',now())),null)
    on conflict(user_id) do update set id=excluded.id,warning_signs=excluded.warning_signs,immediate_actions=excluded.immediate_actions,safe_places=excluded.safe_places,important_reminder=excluded.important_reminder,grounding_reminder=excluded.grounding_reminder,client_updated_at=excluded.client_updated_at,deleted_at=null,updated_at=timezone('utc',now()) where public.support_plans.client_updated_at<=excluded.client_updated_at;
  else
    select client_updated_at into v_existing from public.support_contacts where id=v_id and user_id=v_user_id;
    if v_existing is not null and v_existing > v_client_updated_at then return 'remote_newer'; end if;
    insert into public.support_contacts(id,user_id,name,relationship,phone,availability_notes,priority,active,client_updated_at,created_at,deleted_at)
    values(v_id,v_user_id,p_record->>'name',nullif(p_record->>'relationship',''),p_record->>'phone',nullif(p_record->>'availabilityNotes',''),(p_record->>'priority')::smallint,coalesce((p_record->>'active')::boolean,true),v_client_updated_at,coalesce((p_record->>'createdAt')::timestamptz,timezone('utc',now())),null)
    on conflict(id) do update set name=excluded.name,relationship=excluded.relationship,phone=excluded.phone,availability_notes=excluded.availability_notes,priority=excluded.priority,active=excluded.active,client_updated_at=excluded.client_updated_at,deleted_at=null,updated_at=timezone('utc',now()) where public.support_contacts.user_id=v_user_id and public.support_contacts.client_updated_at<=excluded.client_updated_at;
  end if;
  return 'applied';
end;
$$;

create or replace function public.pull_care_records(p_entity_type text,p_cursor_updated_at timestamptz default '1970-01-01 00:00:00+00',p_cursor_id uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 500)
returns table(entity_type text,entity_id uuid,server_updated_at timestamptz,payload jsonb) language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_entity_type not in ('support_plan','support_contact') then return query select * from public.pull_care_records_v3(p_entity_type,p_cursor_updated_at,p_cursor_id,p_limit); end if;
  if p_entity_type='support_plan' then
    return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.support_plans item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit least(greatest(coalesce(p_limit,500),1),500);
  else
    return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.support_contacts item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit least(greatest(coalesce(p_limit,500),1),500);
  end if;
end;
$$;
revoke all on function public.sync_care_record(text,jsonb) from public;
grant execute on function public.sync_care_record(text,jsonb) to authenticated;
revoke all on function public.pull_care_records(text,timestamptz,uuid,integer) from public;
grant execute on function public.pull_care_records(text,timestamptz,uuid,integer) to authenticated;
commit;
