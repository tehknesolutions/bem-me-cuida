begin;
select plan(12);

select has_table('public','professionals','professionals existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='professionals' and c.relrowsecurity),'RLS ativa em professionals');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='professionals' and policyname='professionals_select_own'),'professionals_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='professionals' and policyname='professionals_insert_own'),'professionals_insert_own existe');

select has_table('public','appointments','appointments existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='appointments' and c.relrowsecurity),'RLS ativa em appointments');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='appointments' and policyname='appointments_select_own'),'appointments_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='appointments' and policyname='appointments_insert_own'),'appointments_insert_own existe');

select has_table('public','treatments','treatments existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='treatments' and c.relrowsecurity),'RLS ativa em treatments');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='treatments' and policyname='treatments_select_own'),'treatments_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='treatments' and policyname='treatments_insert_own'),'treatments_insert_own existe');

select * from finish();
rollback;
