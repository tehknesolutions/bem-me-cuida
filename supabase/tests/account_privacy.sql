begin;
select plan(7);

select has_table('public','account_deletion_requests','account_deletion_requests existe');
select has_column('public','account_deletion_requests','status','status existe');
select has_column('public','account_deletion_requests','requested_at','requested_at existe');
select ok(
  exists(
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'account_deletion_requests' and c.relrowsecurity
  ),
  'RLS ativa em account_deletion_requests'
);
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='account_deletion_requests' and policyname='account_deletion_requests_select_own'),'select próprio existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='account_deletion_requests' and policyname='account_deletion_requests_insert_own'),'insert próprio existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='account_deletion_requests' and policyname='account_deletion_requests_update_own'),'update próprio existe');

select * from finish();
rollback;
