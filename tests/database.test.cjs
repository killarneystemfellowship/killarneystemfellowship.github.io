#!/usr/bin/env node
"use strict";
// Disposable PostgreSQL tests, including an upgrade from the original PR schema.
// PGlite executes the actual SQL and pgcrypto; no live Supabase data is touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { webcrypto } = require('node:crypto');
const sqlRequire = process.env.PGLITE_PACKAGE_JSON ? createRequire(process.env.PGLITE_PACKAGE_JSON) : require;
const { PGlite } = sqlRequire('@electric-sql/pglite');
const { pgcrypto } = sqlRequire('@electric-sql/pglite/contrib/pgcrypto');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const schema = read('stemquest/dna/backend/supabase.sql');
const smoke = read('stemquest/dna/backend/smoke.sql');
const previous = execFileSync('git', ['show', '1240cdc7f20ef4aaa6b43de71ba5845e7ed446ce:stemquest/dna/backend/supabase.sql'], { cwd: root, encoding: 'utf8' });

async function database() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec('create role anon; create role authenticated;');
  return db;
}
async function rpc(db, name, args) {
  const parameters = Object.keys(args);
  assert.match(name, /^stemquest_[a-z_]+$/);
  parameters.forEach((key) => assert.match(key, /^p_[a-z_]+$/));
  const sql = `select public.${name}(${parameters.map((key, index) => `${key} => $${index + 1}`).join(', ')}) as result`;
  const values = Object.values(args).map((value) => value && typeof value === 'object' ? JSON.stringify(value) : value);
  return (await db.query(sql, values)).rows[0].result;
}

async function testMigration() {
  const db = await database();
  try {
    await db.exec(previous);
    await db.exec("update public.stemquest_workshop_sessions set is_active=true, organizer_pin_hash=extensions.crypt('old-private-pin',extensions.gen_salt('bf')) where class_code='DNA-DEMO'");
    const token = 'legacy-browser-token-'.repeat(4);
    let legacy = await rpc(db, 'stemquest_join_student', { p_class_code: 'DNA-DEMO', p_nickname: 'Existing learner', p_grade_level: '4', p_group_number: 3, p_resume_token: token });
    legacy = await rpc(db, 'stemquest_save_student_run', { p_run_id: legacy.runId, p_resume_token: token, p_payload: {
      prediction: 'white-stringy-material', experimentSteps: { '1': {completed: true, note:'Original note'} },
      reflections: { dna:'Original answer', soap:'Original soap answer', alcohol:'Original alcohol answer' }, completed:true
    }});
    await db.exec(schema);
    await db.exec(schema);
    const resumed = await rpc(db, 'stemquest_get_student_run', { p_run_id: legacy.runId, p_resume_token: token });
    assert.equal(resumed.workshopSlug, 'dna-discovery-lab');
    for (const key of Object.keys(legacy)) assert.deepEqual(resumed[key], legacy[key], `Migration preserves ${key}`);
    const report = await rpc(db, 'stemquest_organizer_report', { p_class_code:'DNA-DEMO', p_pin:'old-private-pin' });
    assert.equal(report.responses[0].runId, legacy.runId);
    assert.equal(report.workshop.active, true);
    await db.exec(smoke);
    console.log('PASS: original DNA upgrade twice, existing records/tokens/PIN/completion preserved, all five SQL RPCs and permissions');
  } finally { await db.close(); }
}

async function testFreshAndAdapter() {
  const db = await database();
  try {
    await db.exec(schema);
    await db.exec(schema);
    await db.exec(smoke);
    const window = { location: {search:''}, crypto: webcrypto, TextEncoder, btoa: (text) => Buffer.from(text, 'binary').toString('base64'), setTimeout, clearTimeout, AbortController };
    const context = vm.createContext({ window, URL, URLSearchParams, console, TextEncoder, AbortController, setTimeout, clearTimeout });
    vm.runInContext(read('stemquest/dna/workshops.js'), context);
    window.fetch = async (url, options) => {
      const name = new URL(url).pathname.split('/').pop();
      try {
        const result = await rpc(db, name, JSON.parse(options.body));
        return {ok:true, status:200, text: async () => JSON.stringify(result)};
      } catch (error) {
        return {ok:false, status:400, text: async () => JSON.stringify({message:error.message})};
      }
    };
    vm.runInContext(read('stemquest/dna/storage.js'), context);
    for (const lab of Object.values(window.SCOPE_WORKSHOPS)) {
      const session = (await db.query('select * from public.stemquest_workshop_sessions where class_code=$1', [lab.demoCode])).rows[0];
      assert.equal(session.slug, lab.slug);
      assert.deepEqual(session.prediction_options, Array.from(lab.predictions, ({id}) => id), `${lab.slug} prediction contract`);
      assert.deepEqual(session.observation_tag_options, Array.from(lab.observationTags, ({id}) => id), `${lab.slug} tags contract`);
      assert.equal(session.correct_post_check_answer, lab.postCheckCorrectAnswer);
    }
    await db.exec("update public.stemquest_workshop_sessions set is_active=true, organizer_pin_hash=extensions.crypt('test-private-pin',extensions.gen_salt('bf'))");
    await db.exec('set role anon');
    for (const lab of Object.values(window.SCOPE_WORKSHOPS)) {
      const storage = window.STEMQuestStorage.create({ WORKSHOP_SLUG: lab.slug, SUPABASE_URL: 'https://scope-test.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key-'.repeat(5) });
      assert.equal(storage.mode, 'supabase');
      const {run, resumeToken} = await storage.joinStudent({workshopSlug:lab.slug, classCode:lab.demoCode, nickname:'Integration learner', gradeLevel:lab.slug==='dna-discovery-lab'?'3':'6', groupNumber:1});
      const changes = {introCompleted:true, prediction:lab.correctPrediction, experimentSteps:{'1':{completed:true,note:'Measured'},measurements:{value:'0'}}, observationResult:'yes', observationTags:[lab.observationTags[0].id], observationText:'A recorded result', reflections:Object.fromEntries(lab.reflections.map(({id}) => [id,'Evidence-based answer'])), postCheckAnswer:lab.postCheckCorrectAnswer, understandingRating:5, completed:true};
      const saved = await storage.saveStudentRun({runId:run.runId, resumeToken, changes});
      assert.equal(saved.workshopSlug, lab.slug);
      assert.equal(saved.experimentSteps.measurements.value, '0');
      assert.equal((await storage.getStudentRun({runId:run.runId,resumeToken})).completedAt, saved.completedAt);
      const summary = await storage.getClassSummary(lab.demoCode);
      assert.equal(summary.predictionCounts[lab.correctPrediction],1);
      assert.equal(summary.postCheckCorrectCount,1);
      const report = await storage.getOrganizerReport({classCode:lab.demoCode,pin:'test-private-pin'});
      assert.equal(report.responses.length,1);
      assert.equal(report.workshop.slug,lab.slug);
    }
    console.log('PASS: fresh schema twice, SQL permissions, catalog/seed parity, JavaScript adapter → PostgreSQL round-trip for all five labs');
  } finally { await db.close(); }
}
(async () => { await testMigration(); await testFreshAndAdapter(); })().catch((error) => { console.error(error); process.exitCode=1; });
