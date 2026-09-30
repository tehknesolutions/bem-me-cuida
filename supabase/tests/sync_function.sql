begin;
select plan(4);

select has_function(
  'public',
  'sync_mood_checkin',
  array['jsonb'],
  'função de sincronização de check-in existe'
);

select has_function(
  'public',
  'pull_mood_checkins',
  array['timestamp with time zone', 'uuid', 'integer'],
  'função de paginação de check-in existe'
);

select has_function(
  'public',
  'sync_care_record',
  array['text', 'jsonb'],
  'função de sincronização do plano de cuidado existe'
);

select has_function(
  'public',
  'pull_care_records',
  array['text', 'timestamp with time zone', 'uuid', 'integer'],
  'função de paginação do plano de cuidado existe'
);

select * from finish();
rollback;
