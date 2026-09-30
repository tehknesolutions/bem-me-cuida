begin;

create table public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  title text check (title is null or char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  emotions jsonb not null check (jsonb_typeof(emotions) = 'array'),
  intensity smallint not null check (intensity between 0 and 10),
  triggers jsonb not null default '[]'::jsonb check (jsonb_typeof(triggers) = 'array'),
  strategies jsonb not null default '[]'::jsonb check (jsonb_typeof(strategies) = 'array'),
  for_therapy boolean not null default false,
  linked_checkin_id uuid,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(id, user_id)
);

create index journal_entries_user_occurred_idx on public.journal_entries(user_id, occurred_at desc) where deleted_at is null;
create index journal_entries_user_therapy_idx on public.journal_entries(user_id, for_therapy, occurred_at desc) where deleted_at is null;
create trigger journal_entries_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
alter table public.journal_entries enable row level security;
create policy "journal_entries_select_own" on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal_entries_insert_own" on public.journal_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journal_entries_update_own" on public.journal_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journal_entries_delete_own" on public.journal_entries for delete to authenticated using ((select auth.uid()) = user_id);

alter function public.sync_care_record(text, jsonb) rename to sync_care_record_v2;
alter function public.pull_care_records(text, timestamptz, uuid, integer) rename to pull_care_records_v2;

create or replace function public.sync_care_record(p_entity_type text, p_record jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid := (p_record ->> 'id')::uuid; v_client_updated_at timestamptz := (p_record ->> 'updatedAt')::timestamptz; v_existing timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if (p_record ->> 'userId')::uuid <> v_user_id then raise exception 'account_scope_mismatch'; end if;
  if p_entity_type <> 'journal_entry' then return public.sync_care_record_v2(p_entity_type, p_record); end if;
  select client_updated_at into v_existing from public.journal_entries where id = v_id and user_id = v_user_id;
  if v_existing is not null and v_existing > v_client_updated_at then return 'remote_newer'; end if;
  insert into public.journal_entries (id,user_id,occurred_at,title,body,emotions,intensity,triggers,strategies,for_therapy,linked_checkin_id,client_updated_at,created_at,deleted_at)
  values (v_id,v_user_id,(p_record ->> 'occurredAt')::timestamptz,nullif(p_record ->> 'title',''),p_record ->> 'body',coalesce(p_record -> 'emotions','[]'::jsonb),(p_record ->> 'intensity')::smallint,coalesce(p_record -> 'triggers','[]'::jsonb),coalesce(p_record -> 'strategies','[]'::jsonb),coalesce((p_record ->> 'forTherapy')::boolean,false),case when p_record ->> 'linkedCheckInId' is null then null else (p_record ->> 'linkedCheckInId')::uuid end,v_client_updated_at,coalesce((p_record ->> 'createdAt')::timestamptz,timezone('utc',now())),case when p_record ->> 'deletedAt' is null then null else (p_record ->> 'deletedAt')::timestamptz end)
  on conflict(id) do update set occurred_at=excluded.occurred_at,title=excluded.title,body=excluded.body,emotions=excluded.emotions,intensity=excluded.intensity,triggers=excluded.triggers,strategies=excluded.strategies,for_therapy=excluded.for_therapy,linked_checkin_id=excluded.linked_checkin_id,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.journal_entries.user_id=v_user_id and public.journal_entries.client_updated_at<=excluded.client_updated_at;
  return 'applied';
end;
$$;

create or replace function public.pull_care_records(p_entity_type text,p_cursor_updated_at timestamptz default '1970-01-01 00:00:00+00',p_cursor_id uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 500)
returns table(entity_type text,entity_id uuid,server_updated_at timestamptz,payload jsonb) language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_entity_type <> 'journal_entry' then return query select * from public.pull_care_records_v2(p_entity_type,p_cursor_updated_at,p_cursor_id,p_limit); end if;
  return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.journal_entries item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit least(greatest(coalesce(p_limit,500),1),500);
end;
$$;
revoke all on function public.sync_care_record(text,jsonb) from public;
grant execute on function public.sync_care_record(text,jsonb) to authenticated;
revoke all on function public.pull_care_records(text,timestamptz,uuid,integer) from public;
grant execute on function public.pull_care_records(text,timestamptz,uuid,integer) to authenticated;
commit;
