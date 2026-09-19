"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { webcrypto } = require("node:crypto");
const vm = require("node:vm");

const storageSource = readFileSync(join(__dirname, "../storage.js"), "utf8");
const catalogSource = readFileSync(join(__dirname, "../workshops.js"), "utf8");
const storageKey = "ksf.stemquest.dna.v1";
const plain = (value) => JSON.parse(JSON.stringify(value));

function environment(overrides = {}) {
  const values = overrides.values || new Map();
  const window = {
    crypto: webcrypto, TextEncoder, AbortController, setTimeout, clearTimeout,
    location: { search: "" },
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
    ...overrides,
  };
  const context = vm.createContext({ window, URLSearchParams });
  if (overrides.catalog !== false) vm.runInContext(catalogSource, context);
  vm.runInContext(storageSource, context);
  return { window, values, catalog: window.SCOPE_WORKSHOPS, create: window.STEMQuestStorage.create };
}

function joinInput(lab, extra = {}) {
  return { nickname: "BerryLab", gradeLevel: "5", groupNumber: 1, classCode: lab.demoCode, workshopSlug: lab.slug, ...extra };
}

function credentials(joined) {
  return { runId: joined.run.runId, resumeToken: joined.resumeToken };
}

test("all five labs round-trip, retain answers, and isolate class summaries", async () => {
  const env = environment();
  assert.equal(Object.keys(env.catalog).length, 5);
  for (const lab of Object.values(env.catalog)) {
    const storage = env.create({ WORKSHOP_SLUG: lab.slug });
    const joined = await storage.joinStudent(joinInput(lab));
    const auth = credentials(joined);
    assert.equal(joined.run.workshopSlug, lab.slug);
    assert.equal(joined.resumeToken.length, 43);
    assert.match(joined.run.runId, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
    assert.equal(joined.run.resumeTokenHash, undefined);
    const reflections = Object.fromEntries(lab.reflections.map(({ id }) => [id, `My ${id} answer`]));
    const saved = await storage.saveStudentRun({ ...auth, changes: {
      introCompleted: true,
      prediction: lab.predictions[0].id,
      experimentSteps: { 1: { completed: true, note: "Initial observation" }, measurements: { first: 12, second: 18 } },
      observationResult: "yes", observationTags: [lab.observationTags[0].id],
      observationText: "  We observed   a change. ", reflections,
      postCheckAnswer: lab.postCheckCorrectAnswer, understandingRating: 4, completed: true,
      photo: "data:image/png;base64,not-persisted", nickname: "Not allowed",
    } });
    assert.equal(saved.nickname, "BerryLab");
    assert.equal(saved.observationText, "We observed a change.");
    assert.deepEqual(plain(saved.reflections), reflections);
    assert.equal(saved.experimentSteps.measurements.second, 18);
    assert.equal(saved.photo, undefined);
    assert.deepEqual(plain(await storage.getStudentRun(auth)), plain(saved));
    const completedAt = saved.completedAt;
    const partial = await storage.saveStudentRun({ ...auth, patch: { completed: false } });
    assert.equal(partial.completedAt, completedAt);
    assert.deepEqual(plain(partial.reflections), reflections);
    const second = await storage.joinStudent(joinInput(lab, { nickname: "Second student" }));
    await storage.saveStudentRun({ ...credentials(second), changes: { prediction: lab.predictions[0].id, observationResult: "somewhat", observationTags: [lab.observationTags[0].id] } });
    const summary = await storage.getClassSummary(lab.demoCode.toLowerCase());
    assert.equal(summary.studentCount, 2);
    assert.equal(summary.groupCount, 1);
    assert.equal(summary.successfulGroupCount, 1);
    assert.equal(summary.predictionCounts[lab.predictions[0].id], 2);
    assert.equal(summary.observationTagCounts[lab.observationTags[0].id], 2);
    assert.equal(summary.postCheckCorrectCount, 1);
    assert.equal(summary.workshopSlug, lab.slug);
    for (const key of ["responses", "nickname", "reflections", "resumeTokenHash"]) assert.equal(summary[key], undefined);
    const report = await storage.getOrganizerReport({ classCode: lab.demoCode, pin: "2468" });
    assert.equal(report.responses.length, 2);
    assert.ok(report.responses.every((run) => run.workshopSlug === lab.slug));
    assert.deepEqual(plain(report.summary), plain(summary));
    await assert.rejects(storage.getStudentRun({ ...auth, resumeToken: "wrong-token" }), { code: "resume_denied" });
    await assert.rejects(storage.getOrganizerReport({ classCode: lab.demoCode, pin: "wrong" }), { code: "organizer_denied" });
  }
  assert.equal(JSON.stringify(Object.fromEntries(env.values)).includes("not-persisted"), false);
});

test("existing DNA local data migrates without losing its code, run, token, or legacy reflections", async () => {
  const old = environment({ catalog: false });
  const storage = old.create({ DEFAULT_CLASS_CODE: "DNA-OLD" });
  const joined = await storage.joinStudent({ nickname: "Existing", gradeLevel: "5", groupNumber: 3, classCode: "DNA-OLD" });
  await storage.saveStudentRun({ ...credentials(joined), changes: { reflections: { soap: "Membranes", alcohol: "Clumps" }, prediction: "white-stringy-material" } });
  const state = JSON.parse(old.values.get(storageKey));
  const legacyWorkshop = state.workshops["dna-discovery-lab"];
  for (const key of ["predictionOptions", "observationTagOptions", "correctPostCheckAnswer"]) delete legacyWorkshop[key];
  delete state.runs[joined.run.runId].workshopSlug;
  old.values.set(storageKey, JSON.stringify({ version: 1, workshop: legacyWorkshop, runs: state.runs }));
  const migrated = environment({ values: old.values });
  const resumed = await migrated.create().getStudentRun(credentials(joined));
  assert.equal(resumed.classCode, "DNA-OLD");
  assert.equal(resumed.workshopSlug, "dna-discovery-lab");
  assert.deepEqual(plain(resumed.reflections), { soap: "Membranes", alcohol: "Clumps" });
  const summary = await migrated.create().getClassSummary("DNA-OLD");
  assert.equal(summary.predictionWhiteStringyMaterialCount, 1);
  assert.equal(summary.predictionCounts["white-stringy-material"], 1);
  const yeast = migrated.catalog["yeast-balloon-lab"];
  await migrated.create().joinStudent(joinInput(yeast));
  assert.equal(JSON.parse(old.values.get(storageKey)).version, 2);
  assert.equal((await migrated.create().getStudentRun(credentials(joined))).runId, joined.run.runId);
});

test("concurrent local joins and partial saves do not overwrite each other", async () => {
  const env = environment();
  const storage = env.create();
  const lab = env.catalog["dna-discovery-lab"];
  const students = await Promise.all(Array.from({ length: 12 }, (_, index) => storage.joinStudent(joinInput(lab, { nickname: `Student ${index}` }))));
  assert.equal((await storage.getClassSummary(lab.demoCode)).studentCount, students.length);
  const auth = credentials(students[0]);
  await Promise.all([
    storage.saveStudentRun({ ...auth, changes: { prediction: "clear-liquid" } }),
    storage.saveStudentRun({ ...auth, changes: { observationResult: "yes" } }),
    storage.saveStudentRun({ ...auth, changes: { reflections: { dna: "In cells" } } }),
  ]);
  const saved = await storage.getStudentRun(auth);
  assert.equal(saved.prediction, "clear-liquid");
  assert.equal(saved.observationResult, "yes");
  assert.equal(saved.reflections.dna, "In cells");
});

test("validation rejects cross-lab options, malformed progress, oversized Unicode, and photo data", async () => {
  const env = environment();
  const storage = env.create();
  const dna = env.catalog["dna-discovery-lab"];
  const auth = credentials(await storage.joinStudent(joinInput(dna)));
  await assert.rejects(storage.joinStudent(joinInput(dna, { workshopSlug: "yeast-balloon-lab" })), { code: "workshop_not_found" });
  await assert.rejects(storage.joinStudent(joinInput(dna, { groupNumber: 0 })), { code: "invalid_group_number" });
  for (const changes of [
    { prediction: "fed-larger" }, { observationTags: [null] }, { observationTags: ["bubbles"] },
    { understandingRating: 2.5 }, { completed: "false" }, { experimentSteps: [] },
    { reflections: new Date() }, { reflections: { toJSON: () => undefined } },
    { reflections: { text: "🍓".repeat(3000) } },
    { reflections: { image: "data:image/png;base64,payload" } },
    { observationText: "blob:null/preview-id" },
  ]) await assert.rejects(storage.saveStudentRun({ ...auth, changes }));
  const valid = await storage.saveStudentRun({ ...auth, changes: { reflections: { text: "🍓".repeat(2500) }, observationTags: ["white", "white"] } });
  assert.deepEqual(plain(valid.observationTags), ["white"]);
  assert.equal(valid.reflections.text.length, 5000);
});

test("blocked browser storage still supports an in-memory workshop and RFC 4122 UUID fallback", async () => {
  const env = environment({
    crypto: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    localStorage: { setItem() { throw new Error("blocked"); } },
  });
  const storage = env.create();
  assert.equal(storage.persistent, false);
  const joined = await storage.joinStudent(joinInput(env.catalog["dna-discovery-lab"]));
  assert.match(joined.run.runId, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
  assert.equal((await storage.getStudentRun(credentials(joined))).nickname, "BerryLab");
});

test("REST adapter sends the SQL RPC contract and handles scalar/single-row responses", async () => {
  const calls = [];
  let response = { runId: "run-id", workshopSlug: "yeast-balloon-lab" };
  const env = environment({ fetch: async (url, options) => {
    calls.push({ url, ...options, body: JSON.parse(options.body) });
    return { ok: true, text: async () => JSON.stringify(response) };
  } });
  const key = "sb_publishable_" + "k".repeat(40);
  const storage = env.create({ SUPABASE_URL: "https://example.supabase.co/", SUPABASE_PUBLISHABLE_KEY: key });
  const lab = env.catalog["yeast-balloon-lab"];
  const joined = await storage.joinStudent(joinInput(lab));
  assert.equal(storage.mode, "supabase");
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/stemquest_join_student");
  assert.equal(calls[0].headers.apikey, key);
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.deepEqual(plain(calls[0].body), { p_class_code: "YEAST-DEMO", p_nickname: "BerryLab", p_grade_level: "5", p_group_number: 1, p_resume_token: joined.resumeToken, p_workshop_slug: lab.slug });
  response = [{ runId: "run-id", workshopSlug: lab.slug }];
  await storage.saveStudentRun({ ...credentials(joined), changes: { prediction: "fed-larger", photo: "not-uploaded", reflections: { gas: "CO2" } } });
  assert.deepEqual(plain(calls[1].body.p_payload), { prediction: "fed-larger", reflections: { gas: "CO2" } });
  assert.equal((await storage.getStudentRun(credentials(joined))).workshopSlug, lab.slug);
  await storage.getClassSummary("yeast-demo");
  assert.deepEqual(calls[3].body, { p_class_code: "YEAST-DEMO" });
  await storage.getOrganizerReport({ classCode: "yeast-demo", pin: "organizer-pin" });
  assert.deepEqual(calls[4].body, { p_class_code: "YEAST-DEMO", p_pin: "organizer-pin" });
  const legacy = env.create({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "legacy-jwt".repeat(8) });
  await legacy.getClassSummary("DNA-DEMO");
  assert.equal(calls[5].headers.Authorization, "Bearer " + "legacy-jwt".repeat(8));
});

test("REST failures report service errors and enforce request timeout", async () => {
  const config = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "legacy-jwt".repeat(8) };
  const rejected = environment({ fetch: async () => ({ ok: false, status: 400, text: async () => '{"message":"Invalid class"}' }) });
  await assert.rejects(rejected.create(config).getClassSummary("DNA-DEMO"), { code: "remote_400", message: "Invalid class" });
  const offline = environment({ fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(offline.create(config).getClassSummary("DNA-DEMO"), { code: "remote_unreachable" });
  const stalled = environment({ fetch: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
  }) });
  await assert.rejects(stalled.create({ ...config, REQUEST_TIMEOUT_MS: 5 }).getClassSummary("DNA-DEMO"), { code: "remote_timeout" });
});
