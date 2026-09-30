begin;
select plan(18);

select has_table('public', 'mood_checkins', 'mood_checkins existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='mood_checkins' and c.relrowsecurity),'RLS ativa em mood_checkins');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='mood_checkins' and policyname='checkins_select_own'),'checkins_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='mood_checkins' and policyname='checkins_insert_own'),'checkins_insert_own existe');

select has_table('public', 'medications', 'medications existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='medications' and c.relrowsecurity),'RLS ativa em medications');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='medications' and policyname='medications_select_own'),'medications_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='medications' and policyname='medications_insert_own'),'medications_insert_own existe');

select has_table('public', 'medication_schedules', 'medication_schedules existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='medication_schedules' and c.relrowsecurity),'RLS ativa em medication_schedules');

select has_table('public', 'medication_intakes', 'medication_intakes existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='medication_intakes' and c.relrowsecurity),'RLS ativa em medication_intakes');

select has_table('public', 'care_practices', 'care_practices existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='care_practices' and c.relrowsecurity),'RLS ativa em care_practices');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='care_practices' and policyname='care_practices_select_own'),'care_practices_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='care_practices' and policyname='care_practices_insert_own'),'care_practices_insert_own existe');

select has_table('public', 'care_practice_completions', 'care_practice_completions existe');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='care_practice_completions' and c.relrowsecurity),'RLS ativa em care_practice_completions');

select * from finish();
rollback;
