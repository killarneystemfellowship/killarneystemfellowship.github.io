(function startOrganizerDashboard() {
  "use strict";

  const storage = window.STEMQuestStorage && window.STEMQuestStorage.create();
  if (!storage) return;

  const accessForm = document.getElementById("organizer-access-form");
  const classCodeInput = document.querySelector("[data-admin-class-code]");
  const pinInput = document.querySelector("[data-admin-pin]");
  const accessError = document.querySelector("[data-admin-access-error]");
  const accessPanel = document.querySelector("[data-admin-access]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const status = document.querySelector("[data-admin-status]");
  const joinLink = document.querySelector("[data-student-join-link]");
  const qr = document.querySelector("[data-workshop-qr]");
  const responseBody = document.querySelector("[data-responses-body]");
  const emptyState = document.querySelector("[data-responses-empty]");
  const tableWrap = document.querySelector("[data-responses-table-wrap]");
  const actionButtons = [...document.querySelectorAll("[data-action]")];

  const predictionFields = {
    "clear-liquid": "predictionClearLiquidCount",
    "white-stringy-material": "predictionWhiteStringyMaterialCount",
    "small-crystals": "predictionSmallCrystalsCount",
    "nothing-visible": "predictionNothingVisibleCount",
  };
  const predictionLabels = {
    "clear-liquid": "Clear liquid",
    "white-stringy-material": "White stringy material",
    "small-crystals": "Small crystals",
    "nothing-visible": "Nothing visible",
  };
  const observationLabels = {
    yes: "Yes",
    somewhat: "Somewhat",
    no: "No",
  };
  const reflectionLabels = {
    dna: "What is DNA and where is it found?",
    mash: "Why mash the strawberries?",
    soap: "Why add soap?",
    alcohol: "Why add cold alcohol?",
    scientists: "Why do scientists study DNA?",
  };

  let activeCode = "";
  let organizerPin = "";
  let currentReport = null;
  let refreshTimer = 0;

  function fixLocalFileLinks() {
    if (window.location.protocol !== "file:") return;
    document.querySelectorAll('a[href="../"]').forEach((link) => {
      link.href = "../index.html";
    });
  }

  function normalizeClassCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 32);
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function setBusy(busy) {
    actionButtons.forEach((button) => {
      button.disabled = busy;
    });
    accessForm?.querySelectorAll("input, button").forEach((control) => {
      control.disabled = busy;
    });
  }

  function setMetric(name, value) {
    const field = document.querySelector(`[data-metric="${name}"]`);
    if (field) field.textContent = String(value);
  }

  function percent(value, total) {
    return total > 0 ? Math.round((Number(value) / Number(total)) * 100) : 0;
  }

  function createTextElement(tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function getJoinUrl(code) {
    const url = new URL("../", window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("code", code);
    return url.href;
  }

  function renderJoinCard(code) {
    const url = getJoinUrl(code);
    if (joinLink) {
      joinLink.href = url;
      joinLink.textContent = url.replace(/^https?:\/\//, "");
    }
    if (!qr) return;
    qr.replaceChildren();
    const image = document.createElement("img");
    image.width = 260;
    image.height = 260;
    image.alt = `QR code to join class ${code}`;
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=18&format=svg&data=${encodeURIComponent(url)}`;
    image.addEventListener("error", () => {
      qr.replaceChildren(createTextElement("p", "QR unavailable. Students can type the join link shown beside it."));
    });
    qr.append(image);
  }

  function renderStorageMode() {
    const title = document.querySelector("[data-storage-mode-title]");
    const copy = document.querySelector("[data-storage-mode-text]");
    const notice = document.querySelector("[data-storage-mode]");
    if (storage.mode === "supabase") {
      if (title) title.textContent = "Shared class storage is connected.";
      if (copy) copy.textContent = "Student devices can contribute to this live report.";
      if (notice) notice.dataset.mode = "shared";
    } else {
      if (title) title.textContent = "Local prototype mode.";
      if (copy) copy.textContent = "Only responses entered in this browser appear here. Connect Supabase before using separate student devices.";
      if (notice) notice.dataset.mode = "local";
    }
  }

  function renderPredictions(summary) {
    const total = Number(summary.predictionSubmittedCount) || 0;
    const totalField = document.querySelector("[data-prediction-total]");
    if (totalField) totalField.textContent = String(total);
    Object.entries(predictionFields).forEach(([option, field]) => {
      const row = document.querySelector(`[data-prediction-option="${option}"]`);
      if (!row) return;
      const count = Number(summary[field]) || 0;
      const countField = row.querySelector("[data-prediction-count]");
      const bar = row.querySelector("[data-prediction-bar]");
      if (countField) countField.textContent = String(count);
      if (bar) bar.style.width = `${percent(count, total)}%`;
    });
  }

  function renderObservations(summary) {
    const fields = {
      yes: "observedYesCount",
      somewhat: "observedSomewhatCount",
      no: "observedNoCount",
    };
    Object.entries(fields).forEach(([result, field]) => {
      const row = document.querySelector(`[data-observation-result="${result}"]`);
      const count = row && row.querySelector("[data-observation-count]");
      if (count) count.textContent = String(Number(summary[field]) || 0);
    });
  }

  function reflectionDetails(reflections) {
    const details = document.createElement("details");
    const values = reflections && typeof reflections === "object" ? reflections : {};
    const answered = Object.values(values).filter((value) => String(value || "").trim()).length;
    const summary = document.createElement("summary");
    summary.textContent = answered ? `${answered} answers` : "Not submitted";
    details.append(summary);
    if (answered) {
      const list = document.createElement("dl");
      Object.entries(reflectionLabels).forEach(([key, label]) => {
        if (!values[key]) return;
        list.append(createTextElement("dt", label), createTextElement("dd", values[key]));
      });
      details.append(list);
    }
    return details;
  }

  function progressLabel(response) {
    if (response.completedAt) return "Complete";
    if (response.postCheckAnswer) return "Reflection";
    if (response.observationResult) return "Analysis";
    const steps = Object.values(response.experimentSteps || {}).filter((step) => step && step.completed).length;
    if (steps) return `${steps}/5 lab steps`;
    if (response.prediction) return "Prediction";
    if (response.introCompleted) return "Introduction";
    return "Joined";
  }

  function renderResponses(responses) {
    const rows = Array.isArray(responses) ? responses : [];
    if (emptyState) emptyState.hidden = rows.length > 0;
    if (tableWrap) tableWrap.hidden = rows.length === 0;
    if (!responseBody) return;
    responseBody.replaceChildren();
    rows
      .slice()
      .sort((a, b) => Number(a.groupNumber) - Number(b.groupNumber) || String(a.nickname).localeCompare(String(b.nickname)))
      .forEach((response) => {
        const row = document.createElement("tr");
        const studentCell = document.createElement("td");
        studentCell.append(createTextElement("strong", response.nickname || "Anonymous"));
        studentCell.append(createTextElement("small", `Grade ${response.gradeLevel || "—"}`));
        const groupCell = createTextElement("td", response.groupNumber || "—");
        const predictionCell = createTextElement("td", predictionLabels[response.prediction] || "Not submitted");
        const observationCell = document.createElement("td");
        observationCell.append(createTextElement("strong", observationLabels[response.observationResult] || "Not submitted"));
        if (response.observationText) observationCell.append(createTextElement("small", response.observationText));
        if (Array.isArray(response.observationTags) && response.observationTags.length) {
          observationCell.append(createTextElement("small", response.observationTags.join(", ")));
        }
        const understandingCell = createTextElement("td", response.understandingRating ? `${response.understandingRating}/5` : "—");
        const progressCell = createTextElement("td", progressLabel(response));
        const reflectionsCell = document.createElement("td");
        reflectionsCell.append(reflectionDetails(response.reflections));
        row.append(studentCell, groupCell, predictionCell, observationCell, understandingCell, progressCell, reflectionsCell);
        responseBody.append(row);
      });
  }

  function renderReport(report) {
    currentReport = report;
    const summary = report.summary || {};
    const title = document.querySelector("[data-workshop-title]");
    const code = document.querySelector("[data-active-class-code]");
    if (title) title.textContent = report.workshop?.title || summary.workshopTitle || "DNA Discovery Lab";
    if (code) code.textContent = activeCode;
    setMetric("students", Number(summary.studentCount) || 0);
    setMetric("groups", Number(summary.groupCount) || 0);
    setMetric("completed", Number(summary.completedCount) || 0);
    const average = Number(summary.understandingResponseCount)
      ? (Number(summary.understandingScoreTotal) / Number(summary.understandingResponseCount)).toFixed(1)
      : "—";
    setMetric("understanding", average);
    renderPredictions(summary);
    renderObservations(summary);
    renderResponses(report.responses);
  }

  async function loadReport(options) {
    if (!activeCode || !organizerPin) return;
    if (!options || !options.quiet) {
      setBusy(true);
      setStatus("Refreshing workshop results…");
    }
    try {
      const report = await storage.getOrganizerReport({ classCode: activeCode, pin: organizerPin });
      renderReport(report);
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      setStatus(`Updated ${time}.`);
      return report;
    } catch (error) {
      if (!options || !options.quiet) throw error;
      setStatus(`Could not refresh: ${error.message || "connection error"}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function startAutoRefresh() {
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      if (!document.hidden) loadReport({ quiet: true });
    }, storage.mode === "supabase" ? 7000 : 3500);
  }

  function csvEscape(value) {
    const text = String(value == null ? "" : value).replace(/\r?\n/g, " ");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv() {
    if (!currentReport) return;
    const columns = [
      "nickname", "grade", "group", "prediction", "observation", "observation tags", "observation notes",
      "understanding / 5", "progress", "DNA and location", "why mash", "why soap", "why alcohol", "why scientists study DNA",
    ];
    const rows = (currentReport.responses || []).map((response) => [
      response.nickname,
      response.gradeLevel,
      response.groupNumber,
      predictionLabels[response.prediction] || "",
      observationLabels[response.observationResult] || "",
      (response.observationTags || []).join("; "),
      response.observationText,
      response.understandingRating,
      progressLabel(response),
      response.reflections?.dna,
      response.reflections?.mash,
      response.reflections?.soap,
      response.reflections?.alcohol,
      response.reflections?.scientists,
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    download(`dna-discovery-${activeCode}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function exportJson() {
    if (!currentReport) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      workshop: currentReport.workshop,
      summary: currentReport.summary,
      responses: currentReport.responses,
      photoPolicy: window.STEMQuestStorage.PHOTO_POLICY,
    };
    download(`dna-discovery-${activeCode}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  async function copyJoinLink() {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink.href);
      setStatus("Student join link copied.");
    } catch (_error) {
      const range = document.createRange();
      range.selectNodeContents(joinLink);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      setStatus("Join link selected. Copy it from the page.");
    }
  }

  accessForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    accessError.hidden = true;
    activeCode = normalizeClassCode(classCodeInput.value);
    organizerPin = pinInput.value.trim();
    if (!activeCode || !organizerPin) {
      accessError.textContent = "Enter both the class code and organizer PIN.";
      accessError.hidden = false;
      return;
    }
    setBusy(true);
    try {
      const report = await storage.getOrganizerReport({ classCode: activeCode, pin: organizerPin });
      renderReport(report);
      renderStorageMode();
      renderJoinCard(activeCode);
      accessPanel.hidden = true;
      dashboard.hidden = false;
      history.replaceState(null, "", `?code=${encodeURIComponent(activeCode)}`);
      setStatus("Dashboard opened. Results refresh automatically.");
      startAutoRefresh();
      document.getElementById("dashboard-title")?.focus?.({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      accessError.textContent = error.message || "The class dashboard could not be opened.";
      accessError.hidden = false;
      pinInput.focus();
    } finally {
      setBusy(false);
    }
  });

  document.addEventListener("click", async (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    try {
      if (control.dataset.action === "refresh-dashboard") await loadReport();
      if (control.dataset.action === "export-csv") exportCsv();
      if (control.dataset.action === "export-json") exportJson();
      if (control.dataset.action === "copy-join-link") await copyJoinLink();
    } catch (error) {
      setStatus(error.message || "That action could not be completed.");
    }
  });

  const queryCode = new URLSearchParams(window.location.search).get("code");
  if (classCodeInput) {
    classCodeInput.value = normalizeClassCode(queryCode || window.STEMQUEST_CONFIG?.DEFAULT_CLASS_CODE || "DNA-DEMO");
    classCodeInput.addEventListener("input", () => {
      classCodeInput.value = normalizeClassCode(classCodeInput.value);
    });
  }
  fixLocalFileLinks();
  renderStorageMode();
})();
