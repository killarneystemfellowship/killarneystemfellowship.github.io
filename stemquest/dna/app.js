(function startDNAQuest() {
  "use strict";

  const workshop = window.SCOPE_WORKSHOP;
  const storage = window.STEMQuestStorage && window.STEMQuestStorage.create({ WORKSHOP_SLUG: workshop.slug });
  if (!storage) return;

  const RESUME_KEY = workshop.slug === "dna-discovery-lab"
    ? "ksf.stemquest.dna.resume.v1" : `ksf.scope.${workshop.slug}.resume.v1`;
  const screenLabels = {
    welcome: ["Welcome", "Get ready"],
    join: ["Join workshop", "1 of 8"],
    introduction: [workshop.introLabel, "2 of 8"],
    prediction: ["Prediction", "3 of 8"],
    "lab-guide": ["Experiment", "4 of 8"],
    observation: ["Observation", "5 of 8"],
    analysis: ["Class results", "6 of 8"],
    reflection: ["Reflection", "7 of 8"],
    badge: [workshop.badgeTitle, "Complete"],
  };
  const screenSequence = [
    "welcome",
    "join",
    "introduction",
    "prediction",
    "lab-guide",
    "observation",
    "analysis",
    "reflection",
    "badge",
  ];
  const predictionMap = {
    "clear-liquid": "predictionClearLiquidCount",
    "white-stringy-material": "predictionWhiteStringyMaterialCount",
    "small-crystals": "predictionSmallCrystalsCount",
    "nothing-visible": "predictionNothingVisibleCount",
  };
  const observationLabels = Object.fromEntries(workshop.observationTags.map(({ id, label }) => [id, label]));

  const screens = [...document.querySelectorAll("[data-screen]")];
  const progress = document.querySelector("[data-progress]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const progressLabel = document.querySelector("[data-progress-label]");
  const progressCount = document.querySelector("[data-progress-count]");
  const saveStatus = document.querySelector("[data-save-status]");
  const saveStatusText = document.querySelector("[data-save-status-text]");
  const announcer = document.querySelector("[data-screen-announcer]");
  const connectionMessage = document.querySelector("[data-connection-message]");
  const connectionMessageText = document.querySelector("[data-connection-message-text]");
  const classCodeField = document.getElementById("workshop-code");
  const joinButton = document.getElementById("start-quest");
  const predictionResults = document.querySelector("[data-prediction-results]");
  const analysisResults = document.querySelector("[data-analysis-results]");
  const photoInput = document.querySelector("[data-photo-input]");
  const photoPreview = document.querySelector("[data-photo-preview]");
  const photoPreviewImage = document.querySelector("[data-photo-preview-image]");

  let currentScreen = "welcome";
  let run = null;
  let resumeToken = "";
  let resumeScreen = "join";
  let photoObjectUrl = "";
  let resultsPoll = 0;
  let saveTimer = 0;
  let saveQueue = Promise.resolve();

  function fixLocalFileLinks() {
    if (window.location.protocol !== "file:") return;
    document.querySelectorAll('a[href="/"]').forEach((link) => {
      link.href = "../../index.html";
    });
    const organizerLink = document.querySelector("[data-organizer-link]");
    if (organizerLink) organizerLink.href = "admin/index.html";
  }

  function normalizeClassCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32);
  }

  function setSaveStatus(message, state) {
    if (!saveStatus || !saveStatusText) return;
    saveStatusText.textContent = message;
    saveStatus.dataset.state = state || "ready";
  }

  function announce(message) {
    if (!announcer) return;
    announcer.textContent = "";
    window.setTimeout(() => {
      announcer.textContent = message;
    }, 40);
  }

  function showMessage(message, tone) {
    if (!connectionMessage || !connectionMessageText) return;
    connectionMessageText.textContent = message;
    connectionMessage.dataset.tone = tone || "info";
    connectionMessage.hidden = false;
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => {
      connectionMessage.hidden = true;
    }, 5200);
  }

  function updateProgress(screenName) {
    const index = Math.max(0, screenSequence.indexOf(screenName));
    const [label, count] = screenLabels[screenName] || screenLabels.welcome;
    const percentage = Math.round((index / (screenSequence.length - 1)) * 100);
    if (progressLabel) progressLabel.textContent = label;
    if (progressCount) progressCount.textContent = count;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progress) {
      progress.setAttribute("aria-valuenow", String(index));
      progress.setAttribute("aria-valuetext", `${label}, ${count}`);
    }
  }

  function stopResultsPolling() {
    if (!resultsPoll) return;
    window.clearInterval(resultsPoll);
    resultsPoll = 0;
  }

  function startResultsPolling() {
    stopResultsPolling();
    if (!run || !["prediction", "analysis"].includes(currentScreen)) return;
    resultsPoll = window.setInterval(() => {
      refreshClassResults().catch(() => {});
    }, storage.mode === "supabase" ? 6000 : 3000);
  }

  function showScreen(name, options) {
    const target = screens.find((screen) => screen.dataset.screen === name);
    if (!target) return;
    screens.forEach((screen) => {
      const active = screen === target;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
      if (!active) screen.classList.remove("is-entering");
    });
    target.classList.remove("is-entering");
    window.requestAnimationFrame(() => target.classList.add("is-entering"));
    currentScreen = name;
    updateProgress(name);
    startResultsPolling();
    if (!options || options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const heading = target.querySelector("h1");
    announce(`${screenLabels[name][0]}. ${heading ? heading.textContent : ""}`);
    if (options && options.focus && heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  function inferResumeScreen(studentRun) {
    if (!studentRun) return "join";
    if (studentRun.completedAt) return "badge";
    if (studentRun.postCheckAnswer) return "reflection";
    if (studentRun.observationResult) return "analysis";
    const completedSteps = Object.values(studentRun.experimentSteps || {}).filter((step) => step && step.completed).length;
    if (completedSteps >= 5) return "observation";
    if (studentRun.prediction) return "lab-guide";
    if (studentRun.introCompleted) return "prediction";
    return "introduction";
  }

  function rememberResumeCredentials() {
    if (!run || !resumeToken) return;
    try {
      window.localStorage.setItem(RESUME_KEY, JSON.stringify({ runId: run.runId, resumeToken }));
    } catch (_error) {
      // The run still works for this page view when private browsing blocks storage.
    }
  }

  function readResumeCredentials() {
    try {
      return JSON.parse(window.localStorage.getItem(RESUME_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function saveRun(changes, quiet) {
    if (!run || !resumeToken) return Promise.resolve(null);
    if (changes.experimentSteps && [...document.querySelectorAll("[data-measurement]")].some((field) => !field.checkValidity())) {
      const message = "Check the measurement values before saving your lab notes.";
      setSaveStatus("Check measurements", "error");
      if (!quiet) showMessage(message, "error");
      return Promise.reject(new Error(message));
    }
    const operation = saveQueue.then(async () => {
      setSaveStatus("Saving…", "saving");
      try {
        run = await storage.saveStudentRun({ runId: run.runId, resumeToken, changes });
        setSaveStatus(storage.mode === "supabase" ? "Saved to class" : storage.persistent ? "Saved on device" : "Saved for this visit", "saved");
        return run;
      } catch (error) {
        setSaveStatus("Not saved", "error");
        if (!quiet) showMessage(error.message || "Your work could not be saved. Please try again.", "error");
        throw error;
      }
    });
    saveQueue = operation.catch(() => {});
    return operation;
  }

  // Keep failed writes on the current screen and allow a deliberate retry.
  function handleAsync(handler) {
    return async (event) => {
      const control = event.submitter || event.target.closest("[data-action]");
      if (control?.disabled) return;
      if (control) control.disabled = true;
      try { await handler(event); }
      catch (error) { showMessage(error.message || "Please try again.", "error"); }
      finally {
        if (control && control.getAttribute("aria-pressed") !== "true") control.disabled = false;
      }
    };
  }

  function fieldError(field, message) {
    const key = field && field.id ? field.id : field;
    const output = document.querySelector(`[data-error-for="${key}"]`);
    if (output) output.textContent = message || "";
    if (field && typeof field.setAttribute === "function") {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
  }

  function clearFormErrors(form) {
    form.querySelectorAll(".field-error").forEach((item) => {
      item.textContent = "";
    });
    form.querySelectorAll("[aria-invalid]").forEach((item) => item.removeAttribute("aria-invalid"));
  }

  function validateForm(form) {
    clearFormErrors(form);
    if (form.checkValidity()) return true;
    const invalid = form.querySelector(":invalid");
    if (invalid) {
      const message = invalid.validity.valueMissing ? "Please complete this question." : invalid.validationMessage;
      fieldError(invalid, message);
      invalid.focus();
    }
    return false;
  }

  function restoreRunToUI() {
    if (!run) return;
    const nickname = document.getElementById("student-nickname");
    const grade = document.getElementById("student-grade");
    const group = document.getElementById("group-number");
    if (nickname) nickname.value = run.nickname || "";
    if (grade) grade.value = run.gradeLevel || "";
    if (classCodeField) classCodeField.value = run.classCode || "";
    if (group) group.value = run.groupNumber || "";

    if (run.prediction) {
      const prediction = document.querySelector(`input[name="prediction"][value="${run.prediction}"]`);
      if (prediction) prediction.checked = true;
      if (predictionResults) predictionResults.hidden = false;
    }

    const steps = run.experimentSteps || {};
    document.querySelectorAll("[data-lab-step]").forEach((card) => {
      const stepNumber = card.dataset.labStep;
      const step = steps[stepNumber] || {};
      const note = card.querySelector("textarea");
      const button = card.querySelector('[data-action="complete-lab-step"]');
      if (note && step.note) note.value = step.note;
      if (step.completed) markStepComplete(card, button, false);
    });
    updateLabContinue();

    const observationChoice = document.querySelector(`input[name="saw_dna"][value="${run.observationResult}"]`);
    if (observationChoice) observationChoice.checked = true;
    const description = document.getElementById("observation-description");
    if (description) description.value = run.observationText || "";
    (run.observationTags || []).forEach((tag) => {
      const checkbox = document.querySelector(`input[name="observation_tags"][value="${tag}"]`);
      if (checkbox) checkbox.checked = true;
    });

    if (run.postCheckAnswer) {
      const answer = document.querySelector(`input[name="analysis_answer"][value="${run.postCheckAnswer}"]`);
      if (answer) answer.checked = true;
      if (analysisResults) analysisResults.hidden = false;
      renderAnswerExplanation(run.postCheckAnswer);
    }

    workshop.reflections.forEach(({ id }) => {
      const field = document.getElementById(`reflection-${id}`);
      if (field) field.value = run.reflections?.[id] || "";
    });
    document.querySelectorAll("[data-measurement]").forEach((field) => {
      field.value = run.experimentSteps?.measurements?.[field.dataset.measurement] ?? "";
    });
    if (run.understandingRating) {
      const confidence = document.querySelector(`input[name="confidence_after"][value="${run.understandingRating}"]`);
      if (confidence) confidence.checked = true;
    }
    updateCharacterCounts();
    renderBadge();
  }

  async function resumeExistingRun() {
    const credentials = readResumeCredentials();
    if (!credentials || !credentials.runId || !credentials.resumeToken) return;
    try {
      const resumed = await storage.getStudentRun(credentials);
      if ((resumed.workshopSlug || "dna-discovery-lab") !== workshop.slug) return;
      run = resumed;
      resumeToken = credentials.resumeToken;
      resumeScreen = inferResumeScreen(run);
      restoreRunToUI();
      if ([...document.querySelectorAll("[data-measurement]")].some((field) => !field.checkValidity())) {
        resumeScreen = "lab-guide";
      }
      if (joinButton) {
        joinButton.firstChild.textContent = run.completedAt ? "View my completed lab " : "Resume my lab ";
      }
      setSaveStatus(storage.mode === "supabase" ? "Class connected" : storage.persistent ? "Saved on device" : "Saved for this visit", "saved");
    } catch (_error) {
      try {
        window.localStorage.removeItem(RESUME_KEY);
      } catch (_ignored) {}
    }
  }

  function markStepComplete(card, button, announceChange) {
    if (!card || !button) return;
    card.classList.add("is-complete");
    card.classList.remove("is-current");
    button.setAttribute("aria-pressed", "true");
    const copy = button.querySelector("span:last-child");
    if (copy) copy.textContent = "Step complete";
    button.disabled = true;
    const next = card.closest("li")?.nextElementSibling?.querySelector("[data-lab-step]");
    if (next) next.classList.add("is-current");
    if (announceChange) announce(`${card.querySelector("h2")?.textContent || "Lab step"} complete.`);
  }

  function collectExperimentSteps() {
    const steps = Object.assign({}, run && run.experimentSteps ? run.experimentSteps : {});
    document.querySelectorAll("[data-lab-step]").forEach((card) => {
      const number = card.dataset.labStep;
      steps[number] = {
        completed: card.classList.contains("is-complete"),
        note: (card.querySelector("textarea")?.value || "").trim().slice(0, 240),
      };
    });
    const measurements = {};
    document.querySelectorAll("[data-measurement]").forEach((field) => {
      if (field.value.trim()) measurements[field.dataset.measurement] = field.value.trim();
    });
    if (Object.keys(measurements).length) steps.measurements = measurements;
    else delete steps.measurements;
    return steps;
  }

  function updateLabContinue() {
    const cards = [...document.querySelectorAll("[data-lab-step]")];
    const complete = cards.length === 5 && cards.every((card) => card.classList.contains("is-complete"));
    const button = document.getElementById("lab-guide-continue");
    if (button) button.disabled = !complete;
  }

  function percentage(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  function updateBar(row, percent) {
    if (!row) return;
    const bar = row.querySelector("b");
    const copy = row.querySelector(":scope > strong");
    if (bar) bar.style.setProperty("--bar-value", `${percent}%`);
    if (copy) copy.textContent = `${percent}%`;
  }

  function renderPredictionSummary(summary) {
    if (!predictionResults) return;
    const total = Number(summary.predictionSubmittedCount) || 0;
    const count = predictionResults.querySelector("[data-prediction-response-count]");
    if (count) count.textContent = String(total);
    workshop.predictions.forEach(({ id }) => {
      const row = predictionResults.querySelector(`[data-option="${id}"]`);
      updateBar(row, percentage(Number(summary.predictionCounts?.[id] ?? summary[predictionMap[id]]) || 0, total));
    });
  }

  function renderAnalysisSummary(summary) {
    if (!analysisResults) return;
    const groups = Number(summary.groupObservationCount ?? summary.groupCount) || 0;
    const successful = Number(summary.successfulGroupCount ?? summary.observedYesCount) || 0;
    const groupsMetric = analysisResults.querySelector('[data-metric="groups"]');
    const successMetric = analysisResults.querySelector('[data-metric="success"]');
    if (groupsMetric) groupsMetric.textContent = String(groups);
    if (successMetric) successMetric.textContent = groups ? `${successful}/${groups}` : "0/0";

    const before = percentage(
      Number(summary.predictionCounts?.[workshop.correctPrediction] ?? summary[predictionMap[workshop.correctPrediction]]) || 0,
      Number(summary.predictionSubmittedCount) || 0
    );
    const after = percentage(
      Number(summary.postCheckCorrectCount) || 0,
      Number(summary.postCheckResponseCount) || 0
    );
    const beforeMetric = analysisResults.querySelector('[data-metric="prediction-accuracy"]');
    const afterMetric = analysisResults.querySelector('[data-metric="concept-accuracy"]');
    if (beforeMetric) beforeMetric.textContent = `${before}%`;
    if (afterMetric) afterMetric.textContent = `${after}%`;
    const chartRows = analysisResults.querySelectorAll('[data-chart="understanding"] > div');
    updateBar(chartRows[0], before);
    updateBar(chartRows[1], after);

    const tagCounts = summary.observationTagCounts || {};
    const sortedTags = Object.entries(tagCounts)
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const cloud = analysisResults.querySelector("[data-observation-cloud]");
    if (cloud) {
      cloud.replaceChildren();
      sortedTags.slice(0, 5).forEach(([tag, count]) => {
        const span = document.createElement("span");
        span.textContent = `${observationLabels[tag] || tag} · ${count}`;
        cloud.append(span);
      });
      if (!sortedTags.length) {
        const span = document.createElement("span");
        span.textContent = "Waiting for observations";
        cloud.append(span);
      }
    }
    const common = analysisResults.querySelector("[data-common-observation]");
    if (common) {
      const top = sortedTags.slice(0, 3).map(([tag]) => observationLabels[tag] || tag);
      common.textContent = top.length ? top.join(", ") : "Waiting for class observations…";
    }
    const text = analysisResults.querySelector("[data-results-text]");
    if (text) {
      text.textContent = `${groups} groups have reported. ${successful} groups reported the observation, fully or partly. ${before}% selected the expected prediction, and ${after}% answered the science check correctly.`;
    }
  }

  async function refreshClassResults() {
    if (!run) return;
    const summary = await storage.getClassSummary(run.classCode);
    renderPredictionSummary(summary);
    renderAnalysisSummary(summary);
  }

  function updateCharacterCounts() {
    document.querySelectorAll("[data-character-count-for]").forEach((counter) => {
      const field = document.getElementById(counter.dataset.characterCountFor);
      if (field) counter.textContent = `${field.value.length} / ${field.maxLength}`;
    });
  }

  function renderAnswerExplanation(answer) {
    const output = document.querySelector("[data-answer-explanation]");
    if (output) output.textContent = `${answer === workshop.postCheckCorrectAnswer ? "That’s right." : "Let’s review."} ${workshop.correctExplanation}`;
  }

  function renderBadge() {
    if (!run) return;
    const badgeName = document.querySelector("[data-badge-name]");
    const badgeDate = document.querySelector("[data-badge-date]");
    if (badgeName) badgeName.textContent = run.nickname || workshop.badgeTitle;
    if (badgeDate) {
      const date = run.completedAt ? new Date(run.completedAt) : new Date();
      badgeDate.textContent = `${date.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })} · Killarney STEM Fellowship`;
    }
  }

  function downloadBadge() {
    if (!run) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) { showMessage("This browser could not create a badge image.", "error"); return; }
    context.fillStyle = "#072235";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(19,193,172,.22)";
    context.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 70) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 70) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke();
    }
    context.fillStyle = "#13c1ac";
    context.beginPath(); context.arc(250, 450, 160, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#f3f0ea";
    context.lineWidth = 22;
    context.beginPath(); context.arc(250, 450, 122, 0, Math.PI * 2); context.stroke();
    context.lineWidth = 12;
    context.beginPath(); context.moveTo(190, 450); context.lineTo(235, 495); context.lineTo(315, 395); context.stroke();
    context.fillStyle = "#13c1ac";
    context.font = "700 30px Arial";
    context.fillText(`SCOPE · ${workshop.title.toUpperCase()}`, 500, 220, 820);
    context.fillStyle = "#f3f0ea";
    context.font = "700 86px Georgia";
    context.fillText(workshop.badgeTitle, 500, 355, 820);
    context.font = "500 36px Arial";
    context.fillStyle = "rgba(243,240,234,.78)";
    context.fillText("Awarded to", 500, 450);
    context.fillStyle = "#f3f0ea";
    context.font = "700 58px Arial";
    context.fillText((run.nickname || workshop.badgeTitle).slice(0, 28), 500, 525, 820);
    context.fillStyle = "#ee8728";
    context.fillRect(500, 585, 180, 8);
    context.fillStyle = "rgba(243,240,234,.72)";
    context.font = "600 28px Arial";
    context.fillText("Killarney STEM Fellowship", 500, 665);
    context.fillText(new Date(run.completedAt || Date.now()).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }), 500, 710);
    const link = document.createElement("a");
    link.download = `${workshop.slug}-badge.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function setupPhotoPreview() {
    if (!photoInput || !photoPreview || !photoPreviewImage) return;
    photoInput.addEventListener("change", () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
        photoInput.value = "";
        showMessage("Choose a JPG, PNG, or WebP image smaller than 8 MB.", "error");
        return;
      }
      if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
      photoObjectUrl = URL.createObjectURL(file);
      photoPreviewImage.src = photoObjectUrl;
      photoPreview.hidden = false;
      showMessage("Photo added as a preview on this device. It is not included in the class report.", "info");
    });
  }

  document.addEventListener("click", handleAsync(async (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "go-to-join") {
      showScreen(run ? resumeScreen : "join", { focus: true });
    } else if (action === "previous-screen") {
      const index = screenSequence.indexOf(currentScreen);
      if (currentScreen === "introduction" && run) {
        resumeScreen = inferResumeScreen(run);
        showScreen("welcome", { focus: true });
      } else if (index > 1) {
        showScreen(screenSequence[index - 1], { focus: true });
      }
    } else if (action === "complete-introduction") {
      const form = document.getElementById("confidence-before-form");
      if (!validateForm(form)) return;
      await saveRun({ introCompleted: true });
      showScreen("prediction", { focus: true });
    } else if (action === "go-to-lab") {
      showScreen("lab-guide", { focus: true });
    } else if (action === "complete-lab-step") {
      const card = control.closest("[data-lab-step]");
      const steps = collectExperimentSteps();
      steps[card.dataset.labStep].completed = true;
      await saveRun({ experimentSteps: steps });
      markStepComplete(card, control, true);
      updateLabContinue();
      const next = card.closest("li")?.nextElementSibling?.querySelector("[data-lab-step]");
      if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (action === "complete-lab-guide") {
      const invalid = [...document.querySelectorAll("[data-measurement]")].find((field) => !field.checkValidity());
      if (invalid) { invalid.reportValidity(); return; }
      window.clearTimeout(saveTimer);
      await saveRun({ experimentSteps: collectExperimentSteps() });
      showScreen("observation", { focus: true });
    } else if (action === "go-to-reflection") {
      showScreen("reflection", { focus: true });
    } else if (action === "remove-photo") {
      if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
      photoObjectUrl = "";
      photoInput.value = "";
      photoPreviewImage.removeAttribute("src");
      photoPreview.hidden = true;
    } else if (action === "download-badge") {
      downloadBadge();
    } else if (action === "start-new-submission") {
      const shouldStartAgain = window.confirm(
        "Start a new submission on this device? Your completed response will stay in the class report."
      );
      if (!shouldStartAgain) return;
      try {
        window.localStorage.removeItem(RESUME_KEY);
      } catch (_ignored) {}
      window.location.reload();
    }
  }));

  document.getElementById("join-workshop-form")?.addEventListener("submit", handleAsync(async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    setSaveStatus("Joining…", "saving");
    try {
      const joined = await storage.joinStudent({
        workshopSlug: workshop.slug,
        nickname: document.getElementById("student-nickname").value,
        gradeLevel: document.getElementById("student-grade").value,
        classCode: classCodeField.value,
        groupNumber: document.getElementById("group-number").value,
      });
      run = joined.run;
      resumeToken = joined.resumeToken;
      rememberResumeCredentials();
      setSaveStatus(storage.mode === "supabase" ? "Class connected" : storage.persistent ? "Saved on device" : "Saved for this visit", "saved");
      restoreRunToUI();
      showScreen("introduction", { focus: true });
    } catch (error) {
      const message = error.message || "The workshop could not be joined.";
      if (/code|workshop/i.test(message)) fieldError(classCodeField, message);
      showMessage(message, "error");
      setSaveStatus("Not joined", "error");
    } finally {
      submit.disabled = false;
    }
  }));

  document.getElementById("prediction-form")?.addEventListener("submit", handleAsync(async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const prediction = new FormData(form).get("prediction");
    await saveRun({ prediction });
    predictionResults.hidden = false;
    await refreshClassResults();
    predictionResults.scrollIntoView({ behavior: "smooth", block: "start" });
    startResultsPolling();
  }));

  document.getElementById("observation-form")?.addEventListener("submit", handleAsync(async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const data = new FormData(form);
    await saveRun({
      experimentSteps: collectExperimentSteps(),
      observationResult: data.get("saw_dna"),
      observationTags: data.getAll("observation_tags"),
      observationText: data.get("observation_description"),
    });
    showScreen("analysis", { focus: true });
  }));

  document.getElementById("analysis-check-form")?.addEventListener("submit", handleAsync(async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const answer = new FormData(form).get("analysis_answer");
    await saveRun({ postCheckAnswer: answer });
    analysisResults.hidden = false;
    analysisResults.dataset.answer = answer === workshop.postCheckCorrectAnswer ? "correct" : "review";
    renderAnswerExplanation(answer);
    await refreshClassResults();
    analysisResults.scrollIntoView({ behavior: "smooth", block: "start" });
    startResultsPolling();
  }));

  document.getElementById("reflection-form")?.addEventListener("submit", handleAsync(async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;
    const data = new FormData(form);
    await saveRun({
      reflections: Object.assign({}, run.reflections, Object.fromEntries(
        workshop.reflections.map(({ id }) => [id, data.get(`reflection_${id}`)])
      )),
      understandingRating: Number(data.get("confidence_after")),
      completed: true,
    });
    renderBadge();
    resumeScreen = "badge";
    showScreen("badge", { focus: true });
  }));

  document.querySelectorAll("textarea").forEach((textarea) => {
    textarea.addEventListener("input", updateCharacterCounts);
  });

  document.querySelectorAll('[data-lab-step] textarea, [data-measurement]').forEach((textarea) => {
    textarea.addEventListener("input", () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        if (run) saveRun({ experimentSteps: collectExperimentSteps() }, true).catch(() => {});
      }, 900);
    });
  });

  if (classCodeField) {
    const queryCode = new URLSearchParams(window.location.search).get("code");
    classCodeField.value = normalizeClassCode(queryCode || (workshop.slug === "dna-discovery-lab" && window.STEMQUEST_CONFIG?.DEFAULT_CLASS_CODE) || workshop.demoCode);
    classCodeField.addEventListener("input", () => {
      const selection = classCodeField.selectionStart;
      classCodeField.value = normalizeClassCode(classCodeField.value);
      classCodeField.setSelectionRange(selection, selection);
    });
  }

  window.addEventListener("online", () => showMessage("You’re back online. New answers can sync with the class.", "success"));
  window.addEventListener("offline", () => showMessage(storage.mode === "supabase"
    ? "You’re offline. Keep this page open and retry saving when your connection returns."
    : "You’re offline. Your answers can still be saved on this device.", "info"));
  window.addEventListener("beforeunload", () => {
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
  });

  setupPhotoPreview();
  fixLocalFileLinks();
  updateCharacterCounts();
  updateProgress("welcome");
  resumeExistingRun();
  if (storage.mode === "local" && !storage.persistent) {
    showMessage("This browser cannot keep saved work after the page closes. Keep this tab open and ask your presenter for help.", "info");
  }
})();
