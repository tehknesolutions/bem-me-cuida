begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create or replace function public.jsonb_object_size(value jsonb)
returns integer language sql immutable strict set search_path = '' as $$
  select count(*)::integer from jsonb_object_keys(value);
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80), timezone text not null default 'America/Sao_Paulo', locale text not null default 'pt-BR',
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.user_consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('terms','privacy','health_data','analytics','ai_processing')), document_version text not null,
  granted boolean not null, granted_at timestamptz not null default timezone('utc', now()), revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), unique(user_id, document_type, document_version)
);
create table public.mood_checkins (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, occurred_at timestamptz not null,
  mood text not null check (mood in ('very_low','low','neutral','good','very_good')), anxiety smallint not null check (anxiety between 0 and 10), energy smallint not null check (energy between 0 and 10), irritability smallint not null check (irritability between 0 and 10), agitation smallint not null check (agitation between 0 and 10), impulsivity smallint not null check (impulsivity between 0 and 10), concentration smallint not null check (concentration between 0 and 10), craving smallint not null check (craving between 0 and 10),
  sleep_quality text not null check (sleep_quality in ('poor','partial','good')), sleep_minutes smallint check (sleep_minutes between 0 and 1440), note text check (char_length(note) <= 500),
  client_updated_at timestamptz not null, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), deleted_at timestamptz
);
create index mood_checkins_user_occurred_idx on public.mood_checkins(user_id, occurred_at desc) where deleted_at is null;
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100), phone text not null check (char_length(phone) between 3 and 30), relationship text check (char_length(relationship) <= 80), priority smallint not null default 1 check (priority between 1 and 10), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, event_type text not null, entity_type text, entity_id uuid,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc', now()),
  constraint audit_metadata_no_sensitive_content check (jsonb_typeof(metadata) = 'object' and public.jsonb_object_size(metadata) <= 12)
);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger mood_checkins_updated_at before update on public.mood_checkins for each row execute function public.set_updated_at();
create trigger emergency_contacts_updated_at before update on public.emergency_contacts for each row execute function public.set_updated_at();

alter table public.profiles enable row level security; alter table public.user_consents enable row level security; alter table public.mood_checkins enable row level security; alter table public.emergency_contacts enable row level security; alter table public.audit_events enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "consents_select_own" on public.user_consents for select to authenticated using ((select auth.uid()) = user_id);
create policy "consents_insert_own" on public.user_consents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "consents_update_own" on public.user_consents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "checkins_select_own" on public.mood_checkins for select to authenticated using ((select auth.uid()) = user_id);
create policy "checkins_insert_own" on public.mood_checkins for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "checkins_update_own" on public.mood_checkins for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "checkins_delete_own" on public.mood_checkins for delete to authenticated using ((select auth.uid()) = user_id);
create policy "contacts_select_own" on public.emergency_contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy "contacts_insert_own" on public.emergency_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contacts_update_own" on public.emergency_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contacts_delete_own" on public.emergency_contacts for delete to authenticated using ((select auth.uid()) = user_id);

commit;
