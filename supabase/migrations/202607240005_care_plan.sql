begin;

create table public.medications (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  dosage_text text not null check (char_length(dosage_text) between 1 and 80),
  instructions text check (char_length(instructions) <= 300),
  prescriber text check (char_length(prescriber) <= 120),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (end_date is null or end_date >= start_date),
  unique(id, user_id)
);

create table public.medication_schedules (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null,
  time_local time not null,
  weekdays_mask smallint not null check (weekdays_mask between 1 and 127),
  reminder_enabled boolean not null default false,
  active boolean not null default true,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(id, user_id),
  foreign key (medication_id, user_id) references public.medications(id, user_id) on delete cascade
);

create table public.medication_intakes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null,
  schedule_id uuid,
  planned_at timestamptz not null,
  occurred_at timestamptz,
  status text not null check (status in ('taken', 'skipped')),
  note text check (char_length(note) <= 200),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(user_id, medication_id, schedule_id, planned_at),
  foreign key (medication_id, user_id) references public.medications(id, user_id) on delete cascade,
  foreign key (schedule_id, user_id) references public.medication_schedules(id, user_id) on delete cascade
);

create table public.care_practices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('breathing','exercise','sleep','therapy','hydration','mindfulness','custom')),
  description text check (char_length(description) <= 300),
  target_minutes smallint check (target_minutes between 1 and 720),
  time_local time,
  weekdays_mask smallint not null check (weekdays_mask between 1 and 127),
  reminder_enabled boolean not null default false,
  active boolean not null default true,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(id, user_id)
);

create table public.care_practice_completions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_id uuid not null,
  planned_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('completed', 'skipped')),
  note text check (char_length(note) <= 200),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(user_id, practice_id, planned_at),
  foreign key (practice_id, user_id) references public.care_practices(id, user_id) on delete cascade
);

create index medications_user_active_idx on public.medications(user_id, active, name) where deleted_at is null;
create index medication_schedules_user_time_idx on public.medication_schedules(user_id, active, time_local) where deleted_at is null;
create index medication_intakes_user_planned_idx on public.medication_intakes(user_id, planned_at desc) where deleted_at is null;
create index care_practices_user_active_idx on public.care_practices(user_id, active, title) where deleted_at is null;
create index care_completions_user_planned_idx on public.care_practice_completions(user_id, planned_at desc) where deleted_at is null;

create trigger medications_updated_at before update on public.medications for each row execute function public.set_updated_at();
create trigger medication_schedules_updated_at before update on public.medication_schedules for each row execute function public.set_updated_at();
create trigger medication_intakes_updated_at before update on public.medication_intakes for each row execute function public.set_updated_at();
create trigger care_practices_updated_at before update on public.care_practices for each row execute function public.set_updated_at();
create trigger care_practice_completions_updated_at before update on public.care_practice_completions for each row execute function public.set_updated_at();

alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_intakes enable row level security;
alter table public.care_practices enable row level security;
alter table public.care_practice_completions enable row level security;

create policy "medications_select_own" on public.medications for select to authenticated using ((select auth.uid()) = user_id);
create policy "medications_insert_own" on public.medications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medications_update_own" on public.medications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "medications_delete_own" on public.medications for delete to authenticated using ((select auth.uid()) = user_id);
create policy "medication_schedules_select_own" on public.medication_schedules for select to authenticated using ((select auth.uid()) = user_id);
create policy "medication_schedules_insert_own" on public.medication_schedules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medication_schedules_update_own" on public.medication_schedules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "medication_schedules_delete_own" on public.medication_schedules for delete to authenticated using ((select auth.uid()) = user_id);
create policy "medication_intakes_select_own" on public.medication_intakes for select to authenticated using ((select auth.uid()) = user_id);
create policy "medication_intakes_insert_own" on public.medication_intakes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medication_intakes_update_own" on public.medication_intakes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "medication_intakes_delete_own" on public.medication_intakes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "care_practices_select_own" on public.care_practices for select to authenticated using ((select auth.uid()) = user_id);
create policy "care_practices_insert_own" on public.care_practices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "care_practices_update_own" on public.care_practices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "care_practices_delete_own" on public.care_practices for delete to authenticated using ((select auth.uid()) = user_id);
create policy "care_completions_select_own" on public.care_practice_completions for select to authenticated using ((select auth.uid()) = user_id);
create policy "care_completions_insert_own" on public.care_practice_completions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "care_completions_update_own" on public.care_practice_completions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "care_completions_delete_own" on public.care_practice_completions for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_care_record(p_entity_type text, p_record jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid := (p_record ->> 'id')::uuid; v_client_updated_at timestamptz := (p_record ->> 'updatedAt')::timestamptz; v_existing_client_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if (p_record ->> 'userId')::uuid <> v_user_id then raise exception 'account_scope_mismatch'; end if;
  if p_entity_type = 'medication' then
    select client_updated_at into v_existing_client_updated_at from public.medications where id = v_id and user_id = v_user_id;
    if v_existing_client_updated_at is not null and v_existing_client_updated_at > v_client_updated_at then return 'remote_newer'; end if;
    insert into public.medications (id,user_id,name,dosage_text,instructions,prescriber,start_date,end_date,active,client_updated_at,deleted_at) values (v_id,v_user_id,p_record->>'name',p_record->>'dosageText',nullif(p_record->>'instructions',''),nullif(p_record->>'prescriber',''),(p_record->>'startDate')::date,case when p_record->>'endDate' is null then null else (p_record->>'endDate')::date end,(p_record->>'active')::boolean,v_client_updated_at,case when p_record->>'deletedAt' is null then null else (p_record->>'deletedAt')::timestamptz end)
    on conflict(id) do update set name=excluded.name,dosage_text=excluded.dosage_text,instructions=excluded.instructions,prescriber=excluded.prescriber,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.medications.user_id=v_user_id and public.medications.client_updated_at<=excluded.client_updated_at;
  elsif p_entity_type = 'medication_schedule' then
    select client_updated_at into v_existing_client_updated_at from public.medication_schedules where id=v_id and user_id=v_user_id; if v_existing_client_updated_at is not null and v_existing_client_updated_at>v_client_updated_at then return 'remote_newer'; end if;
    insert into public.medication_schedules(id,user_id,medication_id,time_local,weekdays_mask,reminder_enabled,active,client_updated_at,deleted_at) values(v_id,v_user_id,(p_record->>'medicationId')::uuid,(p_record->>'timeLocal')::time,(p_record->>'weekdaysMask')::smallint,(p_record->>'reminderEnabled')::boolean,(p_record->>'active')::boolean,v_client_updated_at,case when p_record->>'deletedAt' is null then null else (p_record->>'deletedAt')::timestamptz end) on conflict(id) do update set medication_id=excluded.medication_id,time_local=excluded.time_local,weekdays_mask=excluded.weekdays_mask,reminder_enabled=excluded.reminder_enabled,active=excluded.active,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.medication_schedules.user_id=v_user_id and public.medication_schedules.client_updated_at<=excluded.client_updated_at;
  elsif p_entity_type = 'medication_intake' then
    select client_updated_at into v_existing_client_updated_at from public.medication_intakes where id=v_id and user_id=v_user_id; if v_existing_client_updated_at is not null and v_existing_client_updated_at>v_client_updated_at then return 'remote_newer'; end if;
    insert into public.medication_intakes(id,user_id,medication_id,schedule_id,planned_at,occurred_at,status,note,client_updated_at,deleted_at) values(v_id,v_user_id,(p_record->>'medicationId')::uuid,case when p_record->>'scheduleId' is null then null else (p_record->>'scheduleId')::uuid end,(p_record->>'plannedAt')::timestamptz,case when p_record->>'occurredAt' is null then null else (p_record->>'occurredAt')::timestamptz end,p_record->>'status',nullif(p_record->>'note',''),v_client_updated_at,case when p_record->>'deletedAt' is null then null else (p_record->>'deletedAt')::timestamptz end) on conflict(id) do update set medication_id=excluded.medication_id,schedule_id=excluded.schedule_id,planned_at=excluded.planned_at,occurred_at=excluded.occurred_at,status=excluded.status,note=excluded.note,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.medication_intakes.user_id=v_user_id and public.medication_intakes.client_updated_at<=excluded.client_updated_at;
  elsif p_entity_type = 'care_practice' then
    select client_updated_at into v_existing_client_updated_at from public.care_practices where id=v_id and user_id=v_user_id; if v_existing_client_updated_at is not null and v_existing_client_updated_at>v_client_updated_at then return 'remote_newer'; end if;
    insert into public.care_practices(id,user_id,title,category,description,target_minutes,time_local,weekdays_mask,reminder_enabled,active,client_updated_at,deleted_at) values(v_id,v_user_id,p_record->>'title',p_record->>'category',nullif(p_record->>'description',''),case when p_record->>'targetMinutes' is null then null else (p_record->>'targetMinutes')::smallint end,case when p_record->>'timeLocal' is null then null else (p_record->>'timeLocal')::time end,(p_record->>'weekdaysMask')::smallint,(p_record->>'reminderEnabled')::boolean,(p_record->>'active')::boolean,v_client_updated_at,case when p_record->>'deletedAt' is null then null else (p_record->>'deletedAt')::timestamptz end) on conflict(id) do update set title=excluded.title,category=excluded.category,description=excluded.description,target_minutes=excluded.target_minutes,time_local=excluded.time_local,weekdays_mask=excluded.weekdays_mask,reminder_enabled=excluded.reminder_enabled,active=excluded.active,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.care_practices.user_id=v_user_id and public.care_practices.client_updated_at<=excluded.client_updated_at;
  elsif p_entity_type = 'care_practice_completion' then
    select client_updated_at into v_existing_client_updated_at from public.care_practice_completions where id=v_id and user_id=v_user_id; if v_existing_client_updated_at is not null and v_existing_client_updated_at>v_client_updated_at then return 'remote_newer'; end if;
    insert into public.care_practice_completions(id,user_id,practice_id,planned_at,completed_at,status,note,client_updated_at,deleted_at) values(v_id,v_user_id,(p_record->>'practiceId')::uuid,(p_record->>'plannedAt')::timestamptz,case when p_record->>'completedAt' is null then null else (p_record->>'completedAt')::timestamptz end,p_record->>'status',nullif(p_record->>'note',''),v_client_updated_at,case when p_record->>'deletedAt' is null then null else (p_record->>'deletedAt')::timestamptz end) on conflict(id) do update set practice_id=excluded.practice_id,planned_at=excluded.planned_at,completed_at=excluded.completed_at,status=excluded.status,note=excluded.note,client_updated_at=excluded.client_updated_at,deleted_at=excluded.deleted_at,updated_at=timezone('utc',now()) where public.care_practice_completions.user_id=v_user_id and public.care_practice_completions.client_updated_at<=excluded.client_updated_at;
  else raise exception 'unsupported_care_entity'; end if;
  return 'applied';
end; $$;

create or replace function public.pull_care_records(p_entity_type text,p_cursor_updated_at timestamptz default '1970-01-01 00:00:00+00',p_cursor_id uuid default '00000000-0000-0000-0000-000000000000',p_limit integer default 500)
returns table(entity_type text,entity_id uuid,server_updated_at timestamptz,payload jsonb) language plpgsql stable security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  p_cursor_updated_at:=coalesce(p_cursor_updated_at,'1970-01-01 00:00:00+00'::timestamptz); p_cursor_id:=coalesce(p_cursor_id,'00000000-0000-0000-0000-000000000000'::uuid); p_limit:=least(greatest(coalesce(p_limit,500),1),500);
  if p_entity_type='medication' then return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.medications item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit p_limit;
  elsif p_entity_type='medication_schedule' then return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.medication_schedules item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit p_limit;
  elsif p_entity_type='medication_intake' then return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.medication_intakes item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit p_limit;
  elsif p_entity_type='care_practice' then return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.care_practices item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit p_limit;
  elsif p_entity_type='care_practice_completion' then return query select p_entity_type,item.id,item.updated_at,to_jsonb(item) from public.care_practice_completions item where item.user_id=auth.uid() and (item.updated_at>p_cursor_updated_at or (item.updated_at=p_cursor_updated_at and item.id>p_cursor_id)) order by item.updated_at,item.id limit p_limit;
  else raise exception 'unsupported_care_entity'; end if;
end; $$;

revoke all on function public.sync_care_record(text,jsonb) from public;
grant execute on function public.sync_care_record(text,jsonb) to authenticated;
revoke all on function public.pull_care_records(text,timestamptz,uuid,integer) from public;
grant execute on function public.pull_care_records(text,timestamptz,uuid,integer) to authenticated;

commit;
