#!/usr/bin/env node
"use strict";

// Run: PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.test.cjs
// Set SCOPE_BASE_URL to use an existing server. Otherwise this serves the repo
// on http://127.0.0.1:8765. No test data leaves the temporary browser context.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_ID = "1Xjb3_ISZh8sjFmNIQ8zUPuZOZ-9kIf13BCRz58v1Pfw";
const VIEWPORT_WIDTH = Number(process.env.SCOPE_TEST_WIDTH || 320);
const CASES = [
  { slug: "dna-discovery-lab", grade: "4", title: /DNA Discovery Lab/, science: /DNA|strawberr/i },
  { slug: "yeast-balloon-lab", grade: "6", title: /Yeast Balloon/, science: /yeast|microorganism|ferment/i },
  { slug: "human-engine-lab", grade: "6", title: /Human Engine/, science: /heart|oxygen|circulat/i },
  { slug: "bubbling-leaves-lab", grade: "7", title: /Bubbling Leaves/, science: /photosynthe|oxygen|plant/i },
  { slug: "bird-beak-lab", grade: "7", title: /Bird Beak/, science: /beak|natural selection|evolution/i },
];

let server;
let browser;
let page;
const failures = [];
const pageErrors = [];

async function startServer() {
  if (process.env.SCOPE_BASE_URL) return process.env.SCOPE_BASE_URL.replace(/\/$/, "");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
  server = http.createServer((request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      let filename = path.resolve(ROOT, `.${requestPath}`);
      if (filename !== ROOT && !filename.startsWith(`${ROOT}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if (fs.statSync(filename).isDirectory()) filename = path.join(filename, "index.html");
      response.writeHead(200, { "content-type": mime[path.extname(filename)] || "application/octet-stream" });
      fs.createReadStream(filename).pipe(response);
    } catch (_error) {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(process.env.SCOPE_TEST_PORT || 8765), "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function visible(selector) {
  await page.locator(selector).waitFor({ state: "visible" });
}

async function screen(name) {
  await visible(`[data-screen="${name}"]`);
  assert.equal(await page.locator("[data-screen]:visible").count(), 1, "Exactly one student screen is visible");
  await noHorizontalOverflow(name);
}

async function noHorizontalOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
    `${label}: horizontal overflow at ${dimensions.viewport}px (${JSON.stringify(dimensions)})`);
}

async function exactText(selector, value) {
  await page.waitForFunction(({ selector, value }) => document.querySelector(selector)?.textContent.trim() === value, { selector, value });
}

async function submit(selector) {
  await page.locator(`${selector} button[type="submit"]`).click();
}

async function choose(selector) {
  const input = page.locator(selector).first();
  await input.locator("..").click();
  assert.equal(await input.isChecked(), true, "Clicking a choice label selects its input");
}

async function downloadText(selector) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await pending;
  assert.equal(await download.failure(), null, "Export download succeeds");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { filename: download.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") };
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if (character === "\n" && !quoted) { row.push(field); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  assert.equal(quoted, false, "CSV quoted values are complete");
  row.push(field); rows.push(row);
  return rows;
}

async function fillMeasurements() {
  const values = {};
  const fields = page.locator("[data-measurement]");
  for (let index = 0; index < await fields.count(); index += 1) {
    const field = fields.nth(index);
    const info = await field.evaluate((element) => ({
      key: element.dataset.measurement, tag: element.tagName, type: element.type,
      min: element.min, max: element.max,
      choices: element.tagName === "SELECT" ? [...element.options].filter((item) => item.value && !item.disabled).map((item) => item.value) : [],
    }));
    let value;
    if (info.tag === "SELECT") {
      assert.ok(info.choices.length, `${info.key} has a selectable measurement option`);
      value = info.choices[0];
      await field.selectOption(value);
    } else {
      value = info.type === "number"
        ? String(Math.min(Number(info.max) || 1000, Math.max(Number(info.min) || 0, 20 + index)))
        : `Trial ${index + 1}`;
      await field.fill(value);
    }
    values[info.key] = value;
  }
  return values;
}

async function verifyCatalog(lab) {
  const definition = await page.evaluate(() => window.SCOPE_WORKSHOP);
  assert.equal(definition.slug, lab.slug, "The URL selects the requested module");
  assert.match(await page.title(), lab.title);
  const meta = await page.locator("[data-workshop-meta]").innerText();
  assert.match(meta, /45\s*[–-]\s*50/, "Every source lesson lasts 45–50 minutes");
  assert.match(meta, lab.slug === "dna-discovery-lab" ? /3\s*[–-]\s*5/ : /6\s*[–-]\s*7/, "Source grade band is displayed");
  const options = await page.locator("#choose-workshop option").evaluateAll((elements) => elements.map((item) => item.value));
  assert.deepEqual([...options].sort(), CASES.map((item) => item.slug).sort(), "All five labs are available in the chooser");
  assert.equal(definition.reflections.length, 4, "Each current lesson has four science reflections");
  assert.equal(await page.locator("#reflection-form textarea").count(), 4, "Only the active four reflections render");
  const questions = definition.reflections.map((item) => item.question).join(" ");
  assert.match(questions, lab.science, "Reflections address the selected science");
  if (lab.slug !== "dna-discovery-lab") assert.doesNotMatch(questions, /DNA|strawberr/i, "No copied DNA reflections in other labs");
  if (lab.slug === "human-engine-lab") {
    assert.match(questions, /oxygen/i, "Approved heart reflections cover oxygen demand");
    assert.match(questions, /measur/i, "Approved heart reflections cover measuring heart rate");
  }
  const sourceData = await page.evaluate(() => JSON.stringify({
    workshop: window.SCOPE_WORKSHOP, source: window.SCOPE_LESSON_SOURCE,
    links: [...document.querySelectorAll("a[href]")].map((link) => link.href),
    dates: [...document.querySelectorAll("time[datetime]")].map((time) => time.dateTime),
    text: document.body.textContent,
  }));
  assert.ok(sourceData.includes(SOURCE_ID), "Lesson content retains its source document reference");
  assert.match(sourceData, /2026-09-17|September 17,? 2026/, "Lesson content retains the update date");
  return definition;
}

async function completeWorkshop(base, lab, index) {
  await page.goto(`${base}/stemquest/dna/?lab=${lab.slug}`);
  await screen("welcome");
  const definition = await verifyCatalog(lab);
  assert.doesNotMatch(await page.locator("#start-quest").innerText(), /Resume|completed/i, "Another module's resume state does not leak into a new lab");
  await page.locator("#start-quest").click();
  await screen("join");
  const nickname = `Preview ${index + 1}`;
  await page.locator("#student-nickname").fill(nickname);
  await page.locator("#student-grade").selectOption(lab.grade);
  await page.locator("#group-number").fill("1");
  if (index === 1) {
    await page.locator("#workshop-code").fill("DNA-DEMO");
    await submit("#join-workshop-form");
    await visible('[data-error-for="workshop-code"]');
    await page.waitForFunction(() => document.querySelector('[data-error-for="workshop-code"]').textContent.length > 0);
    await screen("join");
  }
  await page.locator("#workshop-code").fill(definition.demoCode);
  await submit("#join-workshop-form");
  await screen("introduction");
  await choose('[name="confidence_before"][value="2"]');
  await page.locator('[data-action="complete-introduction"]').click();
  await screen("prediction");
  await choose(`[name="prediction"][value="${definition.correctPrediction}"]`);
  await submit("#prediction-form");
  await visible("[data-prediction-results]");
  await exactText("[data-prediction-response-count]", "1");
  await exactText(`[data-option="${definition.correctPrediction}"] > strong`, "100%");
  await page.locator('[data-action="go-to-lab"]').click();
  await screen("lab-guide");
  assert.equal(await page.locator("[data-lab-step]").count(), 5, "Five experiment checkpoints render");
  assert.equal(await page.locator("#lab-guide-continue").isDisabled(), true, "Incomplete experiment cannot advance");
  const measurements = await fillMeasurements();
  for (let step = 1; step <= 2; step += 1) {
    await page.locator(`[data-lab-step="${step}"] textarea`).fill(`Observation from step ${step} in ${lab.slug}`);
    await page.locator(`[data-action="complete-lab-step"][data-step="${step}"]`).click();
    await page.waitForFunction((step) => document.querySelector(`[data-lab-step="${step}"]`).classList.contains("is-complete"), step);
  }
  await page.reload();
  await page.waitForFunction(() => /Resume/.test(document.querySelector("#start-quest").textContent));
  await page.locator("#start-quest").click();
  await screen("lab-guide");
  for (let step = 1; step <= 2; step += 1) {
    assert.equal(await page.locator(`[data-action="complete-lab-step"][data-step="${step}"]`).getAttribute("aria-pressed"), "true", "Completed checkpoint survives reload");
    assert.equal(await page.locator(`[data-lab-step="${step}"] textarea`).inputValue(), `Observation from step ${step} in ${lab.slug}`, "Step notes survive reload");
  }
  for (const [key, value] of Object.entries(measurements)) {
    assert.equal(await page.locator(`[data-measurement="${key}"]`).inputValue(), value, "Measurements survive reload");
  }
  if (index === 0) {
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "ksf.stemquest.dna.v1") {
          Storage.prototype.setItem = original;
          throw new DOMException("Simulated full device storage", "QuotaExceededError");
        }
        return original.call(this, key, value);
      };
    });
    await page.locator('[data-action="complete-lab-step"][data-step="3"]').click();
    await page.waitForFunction(() => document.querySelector("[data-save-status]")?.dataset.state === "error");
    assert.equal(await page.locator('[data-action="complete-lab-step"][data-step="3"]').getAttribute("aria-pressed"), "false", "A failed write does not mark the checkpoint complete");
    assert.equal(await page.locator('[data-action="complete-lab-step"][data-step="3"]').isDisabled(), false, "Failed save can be retried");
  }
  for (let step = 3; step <= 5; step += 1) {
    await page.locator(`[data-action="complete-lab-step"][data-step="${step}"]`).click();
    await page.waitForFunction((step) => document.querySelector(`[data-lab-step="${step}"]`).classList.contains("is-complete"), step);
  }
  if (index === 1) {
    const numeric = page.locator('[data-measurement][type="number"]').first();
    const key = await numeric.getAttribute("data-measurement");
    await numeric.fill("-1");
    await page.waitForFunction(() => document.querySelector("[data-save-status-text]")?.textContent === "Check measurements");
    const savedValues = await page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem("ksf.stemquest.dna.v1")).runs)
      .filter((run) => run.workshopSlug === "yeast-balloon-lab").map((run) => run.experimentSteps?.measurements?.[key]), key);
    assert.ok(savedValues.every((value) => value !== "-1"), "Invalid measurements never enter autosaved reports");
    await page.locator("#lab-guide-continue").click();
    await screen("lab-guide");
    assert.equal(await numeric.evaluate((element) => element.validity.rangeUnderflow), true, "Invalid measurements block advancement");
    await numeric.fill(measurements[key]);
  }
  await page.locator("#lab-guide-continue").click();
  await screen("observation");
  await choose('[name="saw_dna"][value="yes"]');
  await choose('[name="observation_tags"]');
  const observation = `Trial ${index + 1}, evidence for ${lab.slug}: "recorded".`;
  await page.locator("#observation-description").fill(observation);
  await submit("#observation-form");
  await screen("analysis");
  await choose(`[name="analysis_answer"][value="${definition.postCheckCorrectAnswer}"]`);
  await submit("#analysis-check-form");
  await visible("[data-analysis-results]");
  await exactText('[data-analysis-results] [data-metric="groups"]', "1");
  await exactText('[data-analysis-results] [data-metric="success"]', "1/1");
  await exactText('[data-analysis-results] [data-metric="concept-accuracy"]', "100%");
  await noHorizontalOverflow("class results");
  await page.locator('[data-action="go-to-reflection"]').click();
  await screen("reflection");
  const answers = {};
  for (const item of definition.reflections) {
    const answer = `Evidence for ${item.id} in ${lab.slug}.`;
    answers[item.id] = answer;
    await page.locator(`#reflection-${item.id}`).fill(answer);
  }
  await choose('[name="confidence_after"][value="5"]');
  await submit("#reflection-form");
  await screen("badge");
  await exactText("[data-badge-name]", nickname);
  assert.match(await page.locator("#screen-badge").innerText(), lab.title, "Badge names the correct workshop");
  await noHorizontalOverflow("completion badge");
  await page.reload();
  await page.waitForFunction(() => /completed/.test(document.querySelector("#start-quest").textContent));
  await page.locator("#start-quest").click();
  await screen("badge");
  await exactText("[data-badge-name]", nickname);

  await page.goto(`${base}/stemquest/dna/admin/?lab=${lab.slug}&code=${definition.demoCode}`);
  await page.locator("#admin-pin").fill("wrong-pin");
  await submit("#organizer-access-form");
  await visible("[data-admin-access-error]");
  assert.equal(await page.locator("[data-admin-dashboard]").isVisible(), false, "Incorrect PIN does not show responses");
  await page.locator("#admin-pin").fill("2468");
  await submit("#organizer-access-form");
  await visible("[data-admin-dashboard]");
  await exactText('[data-metric="students"]', "1");
  await exactText('[data-metric="completed"]', "1");
  assert.match(await page.locator("[data-workshop-title]").innerText(), lab.title);
  assert.match(await page.locator("[data-workshop-qr]").getAttribute("aria-label"), lab.title, "QR accessible label names its workshop");
  const joinUrl = new URL(await page.locator("[data-student-join-link]").getAttribute("href"));
  assert.equal(joinUrl.searchParams.get("lab"), lab.slug, "Dashboard share link selects the correct lab");
  assert.equal(joinUrl.searchParams.get("code"), definition.demoCode);
  assert.equal(await page.locator("[data-responses-body] tr").count(), 1, "Report excludes students from other labs");
  await page.locator("[data-responses-body] details").evaluateAll((elements) => elements.forEach((item) => { item.open = true; }));
  const reportText = await page.locator("[data-responses-body]").innerText();
  assert.ok(reportText.includes(nickname));
  for (const value of Object.values(answers)) assert.ok(reportText.includes(value), "All science reflections appear in the organizer report");
  for (const value of Object.values(measurements)) assert.ok(reportText.includes(value), "Measurements appear in the organizer report");
  await noHorizontalOverflow("organizer dashboard");

  const json = await downloadText('[data-action="export-json"]');
  const payload = JSON.parse(json.text);
  assert.equal(payload.workshop.slug, lab.slug);
  assert.equal(payload.responses.length, 1);
  assert.equal(payload.responses[0].nickname, nickname);
  assert.equal(payload.responses[0].prediction, definition.correctPrediction);
  assert.deepEqual(payload.responses[0].reflections, answers);
  assert.deepEqual(payload.responses[0].experimentSteps.measurements || {}, measurements);
  assert.ok(payload.responses[0].completedAt, "Export includes completion evidence");
  assert.ok(!json.text.includes("resumeToken"), "Export does not contain student credentials");
  const csv = parseCsv((await downloadText('[data-action="export-csv"]')).text);
  assert.equal(csv.length, 2, "CSV includes header and one student");
  assert.equal(csv[0].length, csv[1].length, "CSV quoting preserves column alignment");
  assert.equal(csv[1][csv[0].indexOf("nickname")], nickname);
  assert.equal(csv[1][csv[0].indexOf("observation notes")], observation, "CSV preserves commas and quotation marks");
  assert.deepEqual(JSON.parse(csv[1][csv[0].indexOf("measurements (JSON)")]), measurements);
  for (const item of definition.reflections) {
    const column = csv[0].indexOf(item.question);
    assert.ok(column >= 0, "CSV headers use the selected workshop questions");
    assert.equal(csv[1][column], answers[item.id]);
  }
  console.log(`PASS ${lab.slug}: full flow, saved measurements/notes, resume, results, organizer access, JSON/CSV, ${VIEWPORT_WIDTH}px layout`);
}

async function restartKeepsOtherLabs(base) {
  await page.goto(`${base}/stemquest/dna/`);
  await page.waitForFunction(() => /completed/.test(document.querySelector("#start-quest").textContent));
  assert.equal(await page.evaluate(() => window.SCOPE_WORKSHOP.slug), "dna-discovery-lab", "Original DNA route stays compatible");
  await page.locator("#start-quest").click();
  await screen("badge");
  await exactText("[data-badge-name]", "Preview 1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-action="start-new-submission"]').click();
  await screen("welcome");
  assert.doesNotMatch(await page.locator("#start-quest").innerText(), /Resume|completed/i, "Restart removes the selected lab's resume state");
  await page.locator("#choose-workshop").selectOption("yeast-balloon-lab");
  await submit(".lab-chooser");
  await page.waitForFunction(() => window.SCOPE_WORKSHOP?.slug === "yeast-balloon-lab" && /completed/.test(document.querySelector("#start-quest").textContent));
  await page.locator("#start-quest").click();
  await screen("badge");
  await exactText("[data-badge-name]", "Preview 2");
  const counts = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("ksf.stemquest.dna.v1")).runs).reduce((counts, run) => {
    counts[run.workshopSlug] = (counts[run.workshopSlug] || 0) + 1;
    return counts;
  }, {}));
  assert.deepEqual(counts, Object.fromEntries(CASES.map((lab) => [lab.slug, 1])), "Restart preserves all completed reports without adding a duplicate submission");
  console.log("PASS original DNA route, chooser navigation, completed resume isolation, and restart report preservation");
}

async function main() {
  const base = await startServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: VIEWPORT_WIDTH, height: 740 }, reducedMotion: "reduce", acceptDownloads: true });
  // Keep validation independent of external fonts and the public QR image API.
  await context.route("**/*", (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  for (let index = 0; index < CASES.length; index += 1) await completeWorkshop(base, CASES[index], index);
  await restartKeepsOtherLabs(base);
  assert.deepEqual(pageErrors, [], "No uncaught browser errors");
  assert.deepEqual(failures, [], "Every local asset and navigation target loads");
  console.log("All five SCOPE workshops passed browser integration checks.");
}

main().catch(async (error) => {
  console.error(error.stack || error);
  if (page) {
    const screenshot = path.join(os.tmpdir(), `scope-browser-failure-${Date.now()}.png`);
    try { await page.screenshot({ path: screenshot, fullPage: true }); console.error(`Screenshot: ${screenshot}`); } catch (_ignored) {}
    console.error(`Page: ${page.url()}`);
    const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1) && getComputedStyle(element).position !== "absolute";
    }).slice(0, 12).map((element) => ({ tag: element.tagName, id: element.id, class: element.className, width: element.getBoundingClientRect().width })));
    if (overflow.length) console.error("Elements outside viewport:", overflow);
  }
  if (pageErrors.length) console.error("Browser errors:", pageErrors);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});
