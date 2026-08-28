-- STEMQuest: DNA Discovery Lab
-- Supabase/PostgreSQL schema for one workshop experience.
-- Run this file in the Supabase SQL editor, then follow backend/README.md.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.stemquest_workshop_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null,
  class_code text not null,
  title text not null,
  organizer_pin_hash text not null,
  is_active boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stemquest_workshop_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint stemquest_workshop_code_length
    check (char_length(class_code) between 3 and 32),
  constraint stemquest_workshop_code_normalized
    check (class_code = upper(btrim(class_code))),
  constraint stemquest_workshop_window
    check (closes_at is null or opens_at is null or closes_at > opens_at)
);

-- A workshop type can have many class sessions. Drop the earlier MVP's
-- one-session-per-slug constraint when this schema is rerun as a migration.
alter table public.stemquest_workshop_sessions
  drop constraint if exists stemquest_workshop_sessions_slug_key;

create index if not exists stemquest_workshop_slug_index
  on public.stemquest_workshop_sessions (slug);

drop index if exists public.stemquest_workshop_class_code_unique;
create unique index stemquest_workshop_class_code_unique
  on public.stemquest_workshop_sessions (class_code);

create table if not exists public.stemquest_student_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  workshop_id uuid not null references public.stemquest_workshop_sessions(id) on delete cascade,
  resume_token_hash bytea not null,
  nickname text not null,
  grade_level text not null,
  group_number integer not null,
  intro_completed boolean not null default false,
  prediction text,
  experiment_steps jsonb not null default '{}'::jsonb,
  observation_result text,
  observation_tags text[] not null default '{}'::text[],
  observation_text text,
  reflections jsonb not null default '{}'::jsonb,
  post_check_answer text,
  understanding_rating smallint,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint stemquest_nickname_length
    check (char_length(nickname) between 1 and 40),
  constraint stemquest_grade_length
    check (char_length(grade_level) between 1 and 24),
  constraint stemquest_group_range
    check (group_number between 1 and 99),
  constraint stemquest_prediction_value
    check (prediction is null or prediction in (
      'clear-liquid',
      'white-stringy-material',
      'small-crystals',
      'nothing-visible'
    )),
  constraint stemquest_experiment_steps_object
    check (jsonb_typeof(experiment_steps) = 'object' and octet_length(experiment_steps::text) <= 12000),
  constraint stemquest_observation_value
    check (observation_result is null or observation_result in ('yes', 'somewhat', 'no')),
  constraint stemquest_observation_tags_values
    check (
      cardinality(observation_tags) <= 6
      and observation_tags <@ array[
        'white',
        'cloudy',
        'stringy',
        'clumpy',
        'web-like',
        'no-visible-change'
      ]::text[]
    ),
  constraint stemquest_observation_text_length
    check (observation_text is null or char_length(observation_text) <= 2000),
  constraint stemquest_reflections_object
    check (jsonb_typeof(reflections) = 'object' and octet_length(reflections::text) <= 12000),
  constraint stemquest_post_check_length
    check (post_check_answer is null or char_length(post_check_answer) <= 80),
  constraint stemquest_understanding_range
    check (understanding_rating is null or understanding_rating between 1 and 5)
);

create index if not exists stemquest_student_runs_workshop_idx
  on public.stemquest_student_runs (workshop_id, created_at);

create index if not exists stemquest_student_runs_group_idx
  on public.stemquest_student_runs (workshop_id, group_number);

-- No browser role receives direct table access. All browser reads and writes
-- pass through the narrowly scoped SECURITY DEFINER functions below.
alter table public.stemquest_workshop_sessions enable row level security;
alter table public.stemquest_workshop_sessions force row level security;
alter table public.stemquest_student_runs enable row level security;
alter table public.stemquest_student_runs force row level security;

revoke all on table public.stemquest_workshop_sessions from public, anon, authenticated;
revoke all on table public.stemquest_student_runs from public, anon, authenticated;

-- Private serializer. The resume token hash is deliberately omitted.
create or replace function public._stemquest_run_json(
  p_run public.stemquest_student_runs
)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, extensions
as $$
  select jsonb_build_object(
    'runId', p_run.id,
    'workshopId', p_run.workshop_id,
    'classCode', (
      select session.class_code
      from public.stemquest_workshop_sessions as session
      where session.id = p_run.workshop_id
    ),
    'workshopTitle', (
      select session.title
      from public.stemquest_workshop_sessions as session
      where session.id = p_run.workshop_id
    ),
    'nickname', p_run.nickname,
    'gradeLevel', p_run.grade_level,
    'groupNumber', p_run.group_number,
    'introCompleted', p_run.intro_completed,
    'prediction', p_run.prediction,
    'experimentSteps', p_run.experiment_steps,
    'observationResult', p_run.observation_result,
    'observationTags', to_jsonb(p_run.observation_tags),
    'observationText', p_run.observation_text,
    'reflections', p_run.reflections,
    'postCheckAnswer', p_run.post_check_answer,
    'understandingRating', p_run.understanding_rating,
    'completedAt', p_run.completed_at,
    'createdAt', p_run.created_at,
    'updatedAt', p_run.updated_at
  );
$$;

-- Private count-only summary helper. It never returns nicknames, reflection
-- text, observation text, tokens, or individual response rows.
create or replace function public._stemquest_summary(
  p_workshop_id uuid
)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, extensions
as $$
  select jsonb_build_object(
    'studentCount', count(*),
    'groupCount', count(distinct group_number),
    'predictionSubmittedCount', count(*) filter (where prediction is not null),
    'predictionClearLiquidCount', count(*) filter (where prediction = 'clear-liquid'),
    'predictionWhiteStringyMaterialCount', count(*) filter (where prediction = 'white-stringy-material'),
    'predictionSmallCrystalsCount', count(*) filter (where prediction = 'small-crystals'),
    'predictionNothingVisibleCount', count(*) filter (where prediction = 'nothing-visible'),
    'observedYesCount', count(*) filter (where observation_result = 'yes'),
    'observedSomewhatCount', count(*) filter (where observation_result = 'somewhat'),
    'observedNoCount', count(*) filter (where observation_result = 'no'),
    'observationSubmittedCount', count(*) filter (where observation_result is not null),
    'groupObservationCount', count(distinct group_number) filter (where observation_result is not null),
    'successfulGroupCount', count(distinct group_number) filter (where observation_result in ('yes', 'somewhat')),
    'observationTagCounts', jsonb_build_object(
      'white', count(*) filter (where 'white' = any(observation_tags)),
      'cloudy', count(*) filter (where 'cloudy' = any(observation_tags)),
      'stringy', count(*) filter (where 'stringy' = any(observation_tags)),
      'clumpy', count(*) filter (where 'clumpy' = any(observation_tags)),
      'web-like', count(*) filter (where 'web-like' = any(observation_tags)),
      'no-visible-change', count(*) filter (where 'no-visible-change' = any(observation_tags))
    ),
    'completedCount', count(*) filter (where completed_at is not null),
    'postCheckResponseCount', count(*) filter (where post_check_answer is not null),
    'postCheckCorrectCount', count(*) filter (where post_check_answer = 'white-stringy-material'),
    'understandingResponseCount', count(*) filter (where understanding_rating is not null),
    'understandingScoreTotal', coalesce(sum(understanding_rating), 0)
  )
  from public.stemquest_student_runs
  where workshop_id = p_workshop_id;
$$;

create or replace function public.stemquest_join_student(
  p_class_code text,
  p_nickname text,
  p_grade_level text,
  p_group_number integer,
  p_resume_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_workshop public.stemquest_workshop_sessions%rowtype;
  v_run public.stemquest_student_runs%rowtype;
  v_code text := upper(btrim(coalesce(p_class_code, '')));
  v_nickname text := btrim(regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g'));
  v_grade text := btrim(regexp_replace(coalesce(p_grade_level, ''), '\s+', ' ', 'g'));
begin
  if v_code !~ '^[A-Z0-9][A-Z0-9-]{2,31}$' then
    raise exception using errcode = 'P0001', message = 'Enter a valid class or workshop code.';
  end if;
  if char_length(v_nickname) not between 1 and 40 then
    raise exception using errcode = 'P0001', message = 'Enter a nickname to join.';
  end if;
  if char_length(v_grade) not between 1 and 24 then
    raise exception using errcode = 'P0001', message = 'Select a grade level to join.';
  end if;
  if p_group_number is null or p_group_number not between 1 and 99 then
    raise exception using errcode = 'P0001', message = 'Group number must be between 1 and 99.';
  end if;
  if char_length(coalesce(p_resume_token, '')) not between 32 and 256 then
    raise exception using errcode = 'P0001', message = 'A secure resume token is required.';
  end if;

  select *
  into v_workshop
  from public.stemquest_workshop_sessions
  where class_code = v_code
    and slug = 'dna-discovery-lab'
    and is_active
    and (opens_at is null or opens_at <= timezone('utc', now()))
    and (closes_at is null or closes_at >= timezone('utc', now()))
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'That workshop code is not active.';
  end if;

  insert into public.stemquest_student_runs (
    workshop_id,
    resume_token_hash,
    nickname,
    grade_level,
    group_number
  ) values (
    v_workshop.id,
    extensions.digest(convert_to(p_resume_token, 'UTF8'), 'sha256'),
    left(v_nickname, 40),
    left(v_grade, 24),
    p_group_number
  )
  returning * into v_run;

  return public._stemquest_run_json(v_run)
    || jsonb_build_object(
      'classCode', v_workshop.class_code,
      'workshopTitle', v_workshop.title
    );
end;
$$;

create or replace function public.stemquest_get_student_run(
  p_run_id uuid,
  p_resume_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_run public.stemquest_student_runs%rowtype;
  v_workshop public.stemquest_workshop_sessions%rowtype;
begin
  if char_length(coalesce(p_resume_token, '')) not between 32 and 256 then
    raise exception using errcode = 'P0001', message = 'Workshop progress could not be resumed.';
  end if;

  select *
  into v_run
  from public.stemquest_student_runs
  where id = p_run_id
    and resume_token_hash = extensions.digest(convert_to(p_resume_token, 'UTF8'), 'sha256')
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'Workshop progress could not be resumed.';
  end if;

  select * into v_workshop
  from public.stemquest_workshop_sessions
  where id = v_run.workshop_id;

  return public._stemquest_run_json(v_run)
    || jsonb_build_object(
      'classCode', v_workshop.class_code,
      'workshopTitle', v_workshop.title
    );
end;
$$;

create or replace function public.stemquest_save_student_run(
  p_run_id uuid,
  p_resume_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_run public.stemquest_student_runs%rowtype;
  v_workshop public.stemquest_workshop_sessions%rowtype;
begin
  if char_length(coalesce(p_resume_token, '')) not between 32 and 256 then
    raise exception using errcode = 'P0001', message = 'Workshop progress could not be saved.';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = 'P0001', message = 'Workshop progress is not in the expected format.';
  end if;
  if octet_length(p_payload::text) > 30000 then
    raise exception using errcode = 'P0001', message = 'Workshop progress is too large to save.';
  end if;

  if p_payload ? 'introCompleted'
     and jsonb_typeof(p_payload -> 'introCompleted') <> 'boolean' then
    raise exception using errcode = 'P0001', message = 'Introduction status is not valid.';
  end if;
  if p_payload ? 'completed'
     and jsonb_typeof(p_payload -> 'completed') <> 'boolean' then
    raise exception using errcode = 'P0001', message = 'Completion status is not valid.';
  end if;
  if p_payload ? 'prediction'
     and jsonb_typeof(p_payload -> 'prediction') <> 'null'
     and coalesce(p_payload ->> 'prediction', '') not in (
       'clear-liquid', 'white-stringy-material', 'small-crystals', 'nothing-visible'
     ) then
    raise exception using errcode = 'P0001', message = 'That prediction option is not valid.';
  end if;
  if p_payload ? 'experimentSteps'
     and (
       jsonb_typeof(p_payload -> 'experimentSteps') <> 'object'
       or octet_length((p_payload -> 'experimentSteps')::text) > 12000
     ) then
    raise exception using errcode = 'P0001', message = 'Experiment notes are not valid.';
  end if;
  if p_payload ? 'observationResult'
     and jsonb_typeof(p_payload -> 'observationResult') <> 'null'
     and coalesce(p_payload ->> 'observationResult', '') not in ('yes', 'somewhat', 'no') then
    raise exception using errcode = 'P0001', message = 'That observation option is not valid.';
  end if;
  if p_payload ? 'observationTags'
     and jsonb_typeof(p_payload -> 'observationTags') <> 'array' then
    raise exception using errcode = 'P0001', message = 'Observation tags must be a list.';
  end if;
  if p_payload ? 'observationTags'
     and (
       jsonb_array_length(p_payload -> 'observationTags') > 6
       or exists (
         select 1
         from jsonb_array_elements_text(p_payload -> 'observationTags') as tag(value)
         where tag.value not in (
           'white', 'cloudy', 'stringy', 'clumpy', 'web-like', 'no-visible-change'
         )
       )
     ) then
    raise exception using errcode = 'P0001', message = 'One or more observation tags are not valid.';
  end if;
  if p_payload ? 'reflections'
     and (
       jsonb_typeof(p_payload -> 'reflections') <> 'object'
       or octet_length((p_payload -> 'reflections')::text) > 12000
     ) then
    raise exception using errcode = 'P0001', message = 'Reflections are not valid.';
  end if;
  if p_payload ? 'understandingRating'
     and jsonb_typeof(p_payload -> 'understandingRating') <> 'null'
     and (
       jsonb_typeof(p_payload -> 'understandingRating') <> 'number'
       or (p_payload ->> 'understandingRating')::integer not between 1 and 5
     ) then
    raise exception using errcode = 'P0001', message = 'Understanding rating must be from 1 to 5.';
  end if;

  update public.stemquest_student_runs
  set
    intro_completed = case
      when p_payload ? 'introCompleted' then (p_payload ->> 'introCompleted')::boolean
      else intro_completed
    end,
    prediction = case
      when p_payload ? 'prediction' then nullif(p_payload ->> 'prediction', '')
      else prediction
    end,
    experiment_steps = case
      when p_payload ? 'experimentSteps' then p_payload -> 'experimentSteps'
      else experiment_steps
    end,
    observation_result = case
      when p_payload ? 'observationResult' then nullif(p_payload ->> 'observationResult', '')
      else observation_result
    end,
    observation_tags = case
      when p_payload ? 'observationTags' then array(
        select distinct tag.value
        from jsonb_array_elements_text(p_payload -> 'observationTags') as tag(value)
        order by tag.value
      )
      else observation_tags
    end,
    observation_text = case
      when p_payload ? 'observationText' then nullif(left(btrim(coalesce(p_payload ->> 'observationText', '')), 2000), '')
      else observation_text
    end,
    reflections = case
      when p_payload ? 'reflections' then p_payload -> 'reflections'
      else reflections
    end,
    post_check_answer = case
      when p_payload ? 'postCheckAnswer' then nullif(left(btrim(coalesce(p_payload ->> 'postCheckAnswer', '')), 80), '')
      else post_check_answer
    end,
    understanding_rating = case
      when p_payload ? 'understandingRating'
        and jsonb_typeof(p_payload -> 'understandingRating') = 'null' then null
      when p_payload ? 'understandingRating' then (p_payload ->> 'understandingRating')::smallint
      else understanding_rating
    end,
    completed_at = case
      when p_payload ? 'completed'
        and (p_payload ->> 'completed')::boolean then coalesce(completed_at, timezone('utc', now()))
      else completed_at
    end,
    updated_at = timezone('utc', now())
  where id = p_run_id
    and resume_token_hash = extensions.digest(convert_to(p_resume_token, 'UTF8'), 'sha256')
  returning * into v_run;

  if not found then
    raise exception using errcode = 'P0001', message = 'Workshop progress could not be saved.';
  end if;

  select * into v_workshop
  from public.stemquest_workshop_sessions
  where id = v_run.workshop_id;

  return public._stemquest_run_json(v_run)
    || jsonb_build_object(
      'classCode', v_workshop.class_code,
      'workshopTitle', v_workshop.title
    );
end;
$$;

create or replace function public.stemquest_class_summary(
  p_class_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_workshop public.stemquest_workshop_sessions%rowtype;
  v_code text := upper(btrim(coalesce(p_class_code, '')));
begin
  select *
  into v_workshop
  from public.stemquest_workshop_sessions
  where class_code = v_code
    and slug = 'dna-discovery-lab'
    and is_active
    and (opens_at is null or opens_at <= timezone('utc', now()))
    and (closes_at is null or closes_at >= timezone('utc', now()))
  limit 1;

  if not found then
    return jsonb_build_object(
      'found', false,
      'classCode', v_code,
      'workshopTitle', 'STEMQuest: DNA Discovery Lab',
      'studentCount', 0,
      'groupCount', 0,
      'predictionSubmittedCount', 0,
      'predictionClearLiquidCount', 0,
      'predictionWhiteStringyMaterialCount', 0,
      'predictionSmallCrystalsCount', 0,
      'predictionNothingVisibleCount', 0,
      'observedYesCount', 0,
      'observedSomewhatCount', 0,
      'observedNoCount', 0,
      'observationSubmittedCount', 0,
      'groupObservationCount', 0,
      'successfulGroupCount', 0,
      'observationTagCounts', jsonb_build_object(
        'white', 0,
        'cloudy', 0,
        'stringy', 0,
        'clumpy', 0,
        'web-like', 0,
        'no-visible-change', 0
      ),
      'completedCount', 0,
      'postCheckResponseCount', 0,
      'postCheckCorrectCount', 0,
      'understandingResponseCount', 0,
      'understandingScoreTotal', 0
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'classCode', v_workshop.class_code,
    'workshopTitle', v_workshop.title
  ) || public._stemquest_summary(v_workshop.id);
end;
$$;

create or replace function public.stemquest_organizer_report(
  p_class_code text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_workshop public.stemquest_workshop_sessions%rowtype;
  v_responses jsonb;
  v_code text := upper(btrim(coalesce(p_class_code, '')));
begin
  select *
  into v_workshop
  from public.stemquest_workshop_sessions
  where class_code = v_code
    and slug = 'dna-discovery-lab'
  limit 1;

  if not found
     or char_length(coalesce(p_pin, '')) < 8
     or extensions.crypt(p_pin, v_workshop.organizer_pin_hash) <> v_workshop.organizer_pin_hash then
    raise exception using errcode = 'P0001', message = 'Organizer credentials are incorrect.';
  end if;

  select coalesce(
    jsonb_agg(public._stemquest_run_json(run_row) order by run_row.created_at),
    '[]'::jsonb
  )
  into v_responses
  from public.stemquest_student_runs as run_row
  where run_row.workshop_id = v_workshop.id;

  return jsonb_build_object(
    'workshop', jsonb_build_object(
      'id', v_workshop.id,
      'slug', v_workshop.slug,
      'classCode', v_workshop.class_code,
      'title', v_workshop.title,
      'active', v_workshop.is_active,
      'opensAt', v_workshop.opens_at,
      'closesAt', v_workshop.closes_at,
      'createdAt', v_workshop.created_at,
      'updatedAt', v_workshop.updated_at
    ),
    'summary', jsonb_build_object(
      'found', true,
      'classCode', v_workshop.class_code,
      'workshopTitle', v_workshop.title
    ) || public._stemquest_summary(v_workshop.id),
    'responses', v_responses
  );
end;
$$;

-- Fail closed: the example workshop is inactive until its public class code
-- and private organizer PIN are changed after running this script.
insert into public.stemquest_workshop_sessions (
  slug,
  class_code,
  title,
  organizer_pin_hash,
  is_active
) values (
  'dna-discovery-lab',
  'DNA-DEMO',
  'STEMQuest: DNA Discovery Lab',
  extensions.crypt('CHANGE-ME-BEFORE-LAUNCH', extensions.gen_salt('bf')),
  false
)
on conflict (class_code) do nothing;

-- PostgreSQL grants function execution to PUBLIC by default. Remove those
-- implicit grants before exposing only the intended RPC surface.
revoke all on function public._stemquest_run_json(public.stemquest_student_runs) from public, anon, authenticated;
revoke all on function public._stemquest_summary(uuid) from public, anon, authenticated;
revoke all on function public.stemquest_join_student(text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.stemquest_get_student_run(uuid, text) from public, anon, authenticated;
revoke all on function public.stemquest_save_student_run(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.stemquest_class_summary(text) from public, anon, authenticated;
revoke all on function public.stemquest_organizer_report(text, text) from public, anon, authenticated;

grant execute on function public.stemquest_join_student(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.stemquest_get_student_run(uuid, text) to anon, authenticated;
grant execute on function public.stemquest_save_student_run(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.stemquest_class_summary(text) to anon, authenticated;
grant execute on function public.stemquest_organizer_report(text, text) to anon, authenticated;

commit;
