-- Run after supabase.sql in a disposable PostgreSQL database as its owner.
-- Requires the Supabase anon/authenticated roles. Everything rolls back.
begin;

insert into public.stemquest_workshop_sessions (
  slug, class_code, title, organizer_pin_hash, is_active,
  prediction_options, observation_tag_options, correct_post_check_answer
)
select slug, 'SCOPE-TEST-' || split_part(class_code, '-', 1), title,
  extensions.crypt('scope-test-private-pin', extensions.gen_salt('bf')), true,
  prediction_options, observation_tag_options, correct_post_check_answer
from public.stemquest_workshop_sessions
where class_code in ('DNA-DEMO', 'YEAST-DEMO', 'HEART-DEMO', 'LEAF-DEMO', 'BEAK-DEMO');

set local role anon;

do $$
declare
  lab jsonb;
  run jsonb;
  second_run jsonb;
  summary jsonb;
  report jsonb;
  completed_at text;
  denied boolean;
  token text := repeat('student-token-a', 4);
  second_token text := repeat('student-token-b', 4);
begin
  if has_table_privilege(current_user, 'public.stemquest_student_runs', 'SELECT')
     or has_table_privilege(current_user, 'public.stemquest_student_runs', 'INSERT')
     or has_table_privilege(current_user, 'public.stemquest_student_runs', 'UPDATE')
     or has_table_privilege(current_user, 'public.stemquest_workshop_sessions', 'SELECT')
     or has_function_privilege(current_user, 'public._stemquest_summary(uuid)', 'EXECUTE')
     or has_function_privilege(current_user, 'public._stemquest_run_json(public.stemquest_student_runs)', 'EXECUTE') then
    raise exception 'Browser role can bypass the public RPC surface';
  end if;

  for lab in select value from jsonb_array_elements('[
    {"slug":"dna-discovery-lab","code":"SCOPE-TEST-DNA","prediction":"white-stringy-material","tag":"stringy","answer":"white-stringy-material"},
    {"slug":"yeast-balloon-lab","code":"SCOPE-TEST-YEAST","prediction":"fed-larger","tag":"bubbles","answer":"co2"},
    {"slug":"human-engine-lab","code":"SCOPE-TEST-HEART","prediction":"faster","tag":"lub-dub","answer":"oxygen-demand"},
    {"slug":"bubbling-leaves-lab","code":"SCOPE-TEST-LEAF","prediction":"light-more","tag":"light-bubbles","answer":"oxygen"},
    {"slug":"bird-beak-lab","code":"SCOPE-TEST-BEAK","prediction":"beak-environment","tag":"counts-differ","answer":"inherited-variation"}
  ]'::jsonb) loop
    -- The old five-argument DNA call remains supported after migration.
    if lab ->> 'slug' = 'dna-discovery-lab' then
      run := public.stemquest_join_student(lab ->> 'code', 'BerryLab', '3', 1, token);
    else
      run := public.stemquest_join_student(lab ->> 'code', 'BerryLab', '5', 1, token, lab ->> 'slug');
    end if;
    if run ->> 'workshopSlug' <> lab ->> 'slug' or run ? 'resumeTokenHash' then
      raise exception 'Join returned the wrong workshop or a token hash: %', lab ->> 'slug';
    end if;

    run := public.stemquest_save_student_run((run ->> 'runId')::uuid, token, jsonb_build_object(
      'introCompleted', true, 'prediction', lab ->> 'prediction',
      'experimentSteps', '{"1":{"completed":true,"note":"First observation"}}'::jsonb,
      'observationResult', 'yes', 'observationTags', jsonb_build_array(lab ->> 'tag'),
      'observationText', 'We observed a change.',
      'reflections', '{"dna":"In cells","mash":"Break tissue","strands":"DNA","scientists":"Understand life","soap":"Older saved answer"}'::jsonb,
      'postCheckAnswer', lab ->> 'answer', 'understandingRating', 4, 'completed', true,
      'nickname', 'must-not-overwrite', 'workshopId', 'must-not-overwrite'
    ));
    if run ->> 'nickname' <> 'BerryLab'
       or run -> 'reflections' ->> 'soap' <> 'Older saved answer'
       or run -> 'reflections' ->> 'strands' <> 'DNA'
       or run -> 'experimentSteps' -> '1' ->> 'note' <> 'First observation'
       or run ->> 'completedAt' is null then
      raise exception 'Full run did not round-trip or write allowlist was bypassed';
    end if;
    completed_at := run ->> 'completedAt';
    run := public.stemquest_save_student_run((run ->> 'runId')::uuid, token, '{"completed":false}'::jsonb);
    if run ->> 'completedAt' <> completed_at then
      raise exception 'Partial save cleared completion';
    end if;
    if public.stemquest_get_student_run((run ->> 'runId')::uuid, token) <> run then
      raise exception 'Resume response differs from saved response';
    end if;

    denied := false;
    begin
      perform public.stemquest_get_student_run((run ->> 'runId')::uuid, second_token);
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Wrong resume token was accepted'; end if;

    denied := false;
    begin
      perform public.stemquest_save_student_run((run ->> 'runId')::uuid, token,
        jsonb_build_object('prediction', case when lab ->> 'slug' = 'dna-discovery-lab' then 'fed-larger' else 'white-stringy-material' end));
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Prediction from another lab was accepted'; end if;

    denied := false;
    begin
      perform public.stemquest_save_student_run((run ->> 'runId')::uuid, token, '{"observationTags":[null]}'::jsonb);
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Null observation tag was accepted'; end if;

    denied := false;
    begin
      perform public.stemquest_save_student_run((run ->> 'runId')::uuid, token, '{"understandingRating":2.5}'::jsonb);
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Fractional rating was accepted'; end if;

    denied := false;
    begin
      perform public.stemquest_save_student_run((run ->> 'runId')::uuid, token, '{"reflections":{"photo":"data:image/png;base64,not-a-photo"}}'::jsonb);
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Photo data was persisted'; end if;

    denied := false;
    begin
      perform public.stemquest_join_student(lab ->> 'code', 'Wrong lab', '5', 1, token,
        case when lab ->> 'slug' = 'dna-discovery-lab' then 'bird-beak-lab' else 'dna-discovery-lab' end);
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Class code from another lab was accepted'; end if;

    second_run := public.stemquest_join_student(lab ->> 'code', 'Second student', '5', 1, second_token, lab ->> 'slug');
    perform public.stemquest_save_student_run((second_run ->> 'runId')::uuid, second_token, jsonb_build_object(
      'prediction', lab ->> 'prediction', 'observationResult', 'somewhat', 'observationTags', jsonb_build_array(lab ->> 'tag')
    ));
    summary := public.stemquest_class_summary(lab ->> 'code');
    if summary ->> 'studentCount' <> '2' or summary ->> 'groupCount' <> '1'
       or summary ->> 'successfulGroupCount' <> '1' or summary ->> 'completedCount' <> '1'
       or summary ->> 'postCheckCorrectCount' <> '1'
       or summary -> 'predictionCounts' ->> (lab ->> 'prediction') <> '2'
       or summary -> 'observationTagCounts' ->> (lab ->> 'tag') <> '2'
       or summary ->> 'workshopSlug' <> lab ->> 'slug'
       or summary ?| array['responses', 'nickname', 'reflections', 'resumeTokenHash'] then
      raise exception 'Class summary is incorrect or exposes individual data: %', summary;
    end if;
    if lab ->> 'slug' = 'dna-discovery-lab' and summary ->> 'predictionWhiteStringyMaterialCount' <> '2' then
      raise exception 'Legacy DNA summary counter changed';
    end if;

    denied := false;
    begin
      perform public.stemquest_organizer_report(lab ->> 'code', 'incorrect-pin');
    exception when raise_exception then denied := true;
    end;
    if not denied then raise exception 'Wrong organizer PIN was accepted'; end if;
    report := public.stemquest_organizer_report(lab ->> 'code', 'scope-test-private-pin');
    if jsonb_array_length(report -> 'responses') <> 2 or report -> 'summary' <> summary
       or report -> 'workshop' ->> 'slug' <> lab ->> 'slug'
       or report::text like '%resumeTokenHash%' or report::text like '%resume_token_hash%' then
      raise exception 'Organizer report is incorrect or leaks a token hash';
    end if;
  end loop;
end;
$$;

reset role;
update public.stemquest_workshop_sessions set is_active = false where class_code = 'SCOPE-TEST-DNA';
set local role anon;
do $$
begin
  if public.stemquest_class_summary('SCOPE-TEST-DNA') ->> 'found' <> 'false' then
    raise exception 'Inactive class remains publicly visible';
  end if;
  if public.stemquest_organizer_report('SCOPE-TEST-DNA', 'scope-test-private-pin') -> 'summary' ->> 'studentCount' <> '2' then
    raise exception 'Organizer cannot review a closed class';
  end if;
end;
$$;
rollback;
