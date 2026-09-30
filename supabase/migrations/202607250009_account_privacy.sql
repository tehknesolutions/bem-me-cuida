begin;

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','cancelled','completed')),
  requested_at timestamptz not null default timezone('utc', now()),
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_deletion_request_dates check (
    (status <> 'cancelled' or cancelled_at is not null)
    and (status <> 'completed' or completed_at is not null)
  )
);

create trigger account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;

create policy "account_deletion_requests_select_own"
on public.account_deletion_requests for select to authenticated
using ((select auth.uid()) = user_id);

create policy "account_deletion_requests_insert_own"
on public.account_deletion_requests for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'requested');

create policy "account_deletion_requests_update_own"
on public.account_deletion_requests for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and status in ('requested','cancelled')
);

revoke delete on public.account_deletion_requests from authenticated;

commit;
