(function attachSTEMQuestStorage(global) {
  "use strict";

  const STORAGE_KEY = "ksf.stemquest.dna.v1";
  // Keep the original key so existing DNA runs and their resume tokens survive.
  const SCHEMA_VERSION = 2;
  const WORKSHOP_SLUG = "dna-discovery-lab";
  const WORKSHOP_TITLE = "STEMQuest: DNA Discovery Lab";
  const PREDICTIONS = new Set([
    "clear-liquid",
    "white-stringy-material",
    "small-crystals",
    "nothing-visible",
  ]);
  const OBSERVATION_RESULTS = new Set(["yes", "somewhat", "no"]);
  const OBSERVATION_TAGS = new Set([
    "white",
    "cloudy",
    "stringy",
    "clumpy",
    "web-like",
    "no-visible-change",
  ]);
  const REMOTE_PATCH_FIELDS = new Set([
    "introCompleted",
    "prediction",
    "experimentSteps",
    "observationResult",
    "observationTags",
    "observationText",
    "reflections",
    "postCheckAnswer",
    "understandingRating",
    "completed",
  ]);

  function workshopDefinition(slug) {
    const selected = slug || WORKSHOP_SLUG;
    const catalog = global.SCOPE_WORKSHOPS || {};
    if (Object.prototype.hasOwnProperty.call(catalog, selected)) return catalog[selected];
    if (selected === WORKSHOP_SLUG) {
      return {
        slug: WORKSHOP_SLUG,
        title: WORKSHOP_TITLE,
        demoCode: "DNA-DEMO",
        predictions: Array.from(PREDICTIONS, (id) => ({ id })),
        observationTags: Array.from(OBSERVATION_TAGS, (id) => ({ id })),
        postCheckCorrectAnswer: "white-stringy-material",
      };
    }
    throw new STEMQuestStorageError("That workshop is not available.", "invalid_workshop");
  }

  function optionIds(options) {
    return (options || []).map((option) => typeof option === "string" ? option : option.id);
  }

  class STEMQuestStorageError extends Error {
    constructor(message, code, cause) {
      super(message);
      this.name = "STEMQuestStorageError";
      this.code = code || "storage_error";
      if (cause) this.cause = cause;
    }
  }

  function cleanString(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeClassCode(value) {
    return cleanString(value, 32).toUpperCase();
  }

  function validateJoinInput(input) {
    const nickname = cleanString(input && input.nickname, 40);
    const gradeLevel = cleanString(input && input.gradeLevel, 24);
    const classCode = normalizeClassCode(input && input.classCode);
    const groupNumber = Number(input && input.groupNumber);

    if (nickname.length < 1) {
      throw new STEMQuestStorageError("Enter a nickname to join.", "invalid_nickname");
    }
    if (gradeLevel.length < 1) {
      throw new STEMQuestStorageError("Select a grade level to join.", "invalid_grade");
    }
    if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(classCode)) {
      throw new STEMQuestStorageError("Enter a valid class or workshop code.", "invalid_class_code");
    }
    if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 99) {
      throw new STEMQuestStorageError("Group number must be between 1 and 99.", "invalid_group_number");
    }

    return { nickname, gradeLevel, classCode, groupNumber };
  }

  function randomToken(byteLength) {
    const bytes = new Uint8Array(byteLength || 32);
    if (!global.crypto || typeof global.crypto.getRandomValues !== "function") {
      throw new STEMQuestStorageError(
        "This browser cannot create a secure resume token.",
        "secure_random_unavailable"
      );
    }
    global.crypto.getRandomValues(bytes);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return global
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function randomId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    new Uint8Array(bytes).forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return global
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  async function hashToken(token) {
    if (global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function") {
      const bytes = new global.TextEncoder().encode(token);
      const digest = await global.crypto.subtle.digest("SHA-256", bytes);
      return bytesToBase64Url(digest);
    }

    // File previews in older browsers may not expose SubtleCrypto. This hash is
    // only a local fallback; remote mode always hashes tokens in PostgreSQL.
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `local-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function jsonStorageBytes(value) {
    // PostgreSQL jsonb uses spaces after separators and expands exponents.
    // Measure that representation in UTF-8, not JavaScript's UTF-16 length.
    function storedJson(entry) {
      if (Array.isArray(entry)) return `[${entry.map(storedJson).join(", ")}]`;
      if (entry && typeof entry === "object") {
        return `{${Object.entries(entry).map(([key, item]) => `${JSON.stringify(key)}: ${storedJson(item)}`).join(", ")}}`;
      }
      const json = JSON.stringify(entry);
      if (typeof entry !== "number" || !/e/i.test(json)) return json;
      const [mantissa, exponent] = json.toLowerCase().split("e");
      const sign = mantissa.startsWith("-") ? "-" : "";
      const unsigned = mantissa.replace(/^-/, "");
      const digits = unsigned.replace(".", "");
      const point = (unsigned.includes(".") ? unsigned.indexOf(".") : unsigned.length) + Number(exponent);
      if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
      if (point >= digits.length) return `${sign}${digits}${"0".repeat(point - digits.length)}`;
      return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
    }
    const json = storedJson(value);
    return typeof global.TextEncoder === "function"
      ? new global.TextEncoder().encode(json).length
      : encodeURIComponent(json).replace(/%[A-F\d]{2}/gi, "x").length;
  }

  function rejectPhotoData(value) {
    if (/(?:data:image\/|blob:(?:https?:|null\/))/i.test(JSON.stringify(value))) {
      throw new STEMQuestStorageError("Photos stay on this device and cannot be saved.", "photo_persistence_blocked");
    }
  }

  function safeJsonObject(value, maxLength, label) {
    if (value == null) return {};
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new STEMQuestStorageError(`${label} must be an object.`, "invalid_payload");
    }
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new STEMQuestStorageError(`${label} could not be saved.`, "invalid_payload", error);
    }
    const parsed = serialized && JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new STEMQuestStorageError(`${label} must be an object.`, "invalid_payload");
    }
    if (jsonStorageBytes(parsed) > maxLength) {
      throw new STEMQuestStorageError(`${label} is too large to save.`, "payload_too_large");
    }
    rejectPhotoData(parsed);
    return parsed;
  }

  function sanitizePatch(changes, definition) {
    const source = changes && typeof changes === "object" ? changes : {};
    const result = {};
    const predictions = new Set(optionIds(definition.predictions));
    const observationTags = new Set(optionIds(definition.observationTags));

    // This explicit allowlist intentionally omits files, data URLs, and photo
    // fields. Student photos may be previewed in the UI but are never persisted.
    REMOTE_PATCH_FIELDS.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(source, field)) return;
      const value = source[field];

      if (field === "introCompleted" || field === "completed") {
        if (typeof value !== "boolean") {
          throw new STEMQuestStorageError("Progress status must be true or false.", "invalid_payload");
        }
        result[field] = value;
      } else if (field === "prediction") {
        if (value !== null && !predictions.has(value)) {
          throw new STEMQuestStorageError("That prediction option is not valid.", "invalid_prediction");
        }
        result[field] = value;
      } else if (field === "experimentSteps") {
        result[field] = safeJsonObject(value, 12000, "Experiment notes");
      } else if (field === "observationResult") {
        if (value !== null && !OBSERVATION_RESULTS.has(value)) {
          throw new STEMQuestStorageError("That observation option is not valid.", "invalid_observation");
        }
        result[field] = value;
      } else if (field === "observationTags") {
        if (!Array.isArray(value)) {
          throw new STEMQuestStorageError("Observation tags must be a list.", "invalid_observation_tags");
        }
        const tags = Array.from(new Set(value));
        if (tags.length > observationTags.size || tags.some((tag) => !observationTags.has(tag))) {
          throw new STEMQuestStorageError("One or more observation tags are not valid.", "invalid_observation_tags");
        }
        result[field] = tags;
      } else if (field === "observationText") {
        result[field] = cleanString(value, 2000) || null;
      } else if (field === "reflections") {
        result[field] = safeJsonObject(value, 12000, "Reflections");
      } else if (field === "postCheckAnswer") {
        result[field] = cleanString(value, 80) || null;
      } else if (field === "understandingRating") {
        const rating = Number(value);
        if (value !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
          throw new STEMQuestStorageError("Understanding rating must be from 1 to 5.", "invalid_rating");
        }
        result[field] = value === null ? null : rating;
      }
    });

    rejectPhotoData(result);
    return result;
  }

  function publicRun(run) {
    if (!run) return null;
    const copy = clone(run);
    delete copy.resumeTokenHash;
    return copy;
  }

  function emptySummary(classCode, workshop) {
    return {
      found: false,
      classCode,
      workshopTitle: workshop ? workshop.title : WORKSHOP_TITLE,
      workshopSlug: workshop ? workshop.slug : WORKSHOP_SLUG,
      studentCount: 0,
      groupCount: 0,
      predictionSubmittedCount: 0,
      predictionClearLiquidCount: 0,
      predictionWhiteStringyMaterialCount: 0,
      predictionSmallCrystalsCount: 0,
      predictionNothingVisibleCount: 0,
      predictionCounts: Object.fromEntries((workshop ? workshop.predictionOptions : Array.from(PREDICTIONS)).map((id) => [id, 0])),
      observedYesCount: 0,
      observedSomewhatCount: 0,
      observedNoCount: 0,
      observationSubmittedCount: 0,
      groupObservationCount: 0,
      successfulGroupCount: 0,
      observationTagCounts: Object.fromEntries((workshop ? workshop.observationTagOptions : Array.from(OBSERVATION_TAGS)).map((id) => [id, 0])),
      completedCount: 0,
      postCheckResponseCount: 0,
      postCheckCorrectCount: 0,
      understandingResponseCount: 0,
      understandingScoreTotal: 0,
    };
  }

  function summarize(workshop, runs) {
    const summary = emptySummary(workshop.classCode, workshop);
    summary.found = true;
    summary.workshopTitle = workshop.title;
    summary.studentCount = runs.length;
    summary.groupCount = new Set(runs.map((run) => run.groupNumber)).size;
    const groupsWithObservations = new Set();
    const successfulGroups = new Set();

    runs.forEach((run) => {
      if (run.prediction) summary.predictionSubmittedCount += 1;
      if (Object.prototype.hasOwnProperty.call(summary.predictionCounts, run.prediction)) {
        summary.predictionCounts[run.prediction] += 1;
      }
      if (run.prediction === "clear-liquid") summary.predictionClearLiquidCount += 1;
      if (run.prediction === "white-stringy-material") {
        summary.predictionWhiteStringyMaterialCount += 1;
      }
      if (run.prediction === "small-crystals") summary.predictionSmallCrystalsCount += 1;
      if (run.prediction === "nothing-visible") summary.predictionNothingVisibleCount += 1;
      if (run.observationResult === "yes") summary.observedYesCount += 1;
      if (run.observationResult === "somewhat") summary.observedSomewhatCount += 1;
      if (run.observationResult === "no") summary.observedNoCount += 1;
      if (run.observationResult) {
        summary.observationSubmittedCount += 1;
        groupsWithObservations.add(run.groupNumber);
      }
      if (run.observationResult === "yes" || run.observationResult === "somewhat") {
        successfulGroups.add(run.groupNumber);
      }
      (Array.isArray(run.observationTags) ? run.observationTags : []).forEach((tag) => {
        if (Object.prototype.hasOwnProperty.call(summary.observationTagCounts, tag)) {
          summary.observationTagCounts[tag] += 1;
        }
      });
      if (run.completedAt) summary.completedCount += 1;
      if (run.postCheckAnswer) summary.postCheckResponseCount += 1;
      if (run.postCheckAnswer === workshop.correctPostCheckAnswer) summary.postCheckCorrectCount += 1;
      if (Number.isInteger(run.understandingRating)) {
        summary.understandingResponseCount += 1;
        summary.understandingScoreTotal += run.understandingRating;
      }
    });

    summary.groupObservationCount = groupsWithObservations.size;
    summary.successfulGroupCount = successfulGroups.size;

    return summary;
  }

  function canUseLocalStorage() {
    try {
      const probe = `${STORAGE_KEY}.probe`;
      global.localStorage.setItem(probe, "1");
      global.localStorage.removeItem(probe);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function createEmptyLocalState(config) {
    const now = new Date().toISOString();
    const slugs = new Set([WORKSHOP_SLUG, ...Object.keys(global.SCOPE_WORKSHOPS || {})]);
    return {
      version: SCHEMA_VERSION,
      workshops: Object.fromEntries(Array.from(slugs, (slug) => {
        const definition = workshopDefinition(slug);
        return [slug, {
          id: `local-${slug}`,
          slug,
          classCode: normalizeClassCode(slug === WORKSHOP_SLUG ? config.DEFAULT_CLASS_CODE || definition.demoCode : definition.demoCode),
          title: definition.title,
          predictionOptions: optionIds(definition.predictions),
          observationTagOptions: optionIds(definition.observationTags),
          correctPostCheckAnswer: definition.postCheckCorrectAnswer,
          active: true,
          createdAt: now,
        }];
      })),
      runs: {},
    };
  }

  class LocalStorageAdapter {
    constructor(config) {
      this.mode = "local";
      this.config = config;
      this.workshopSlug = config.WORKSHOP_SLUG || WORKSHOP_SLUG;
      this.persistent = canUseLocalStorage();
      this.memoryState = createEmptyLocalState(config);
    }

    readState() {
      if (!this.persistent) return clone(this.memoryState);
      try {
        const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
        if (!parsed || !parsed.runs || (parsed.version !== 1 && parsed.version !== SCHEMA_VERSION)) {
          return createEmptyLocalState(this.config);
        }
        const state = createEmptyLocalState(this.config);
        // Version 1 stored one DNA workshop. Preserve its code, ID, and every
        // existing run while adding the other workshop sessions alongside it.
        const savedWorkshops = parsed.version === 1 && parsed.workshop
          ? { [WORKSHOP_SLUG]: parsed.workshop }
          : parsed.workshops || {};
        Object.entries(savedWorkshops).forEach(([slug, workshop]) => {
          state.workshops[slug] = Object.assign({}, state.workshops[slug], workshop);
        });
        state.runs = parsed.runs;
        Object.values(state.runs).forEach((run) => {
          if (!run.workshopSlug) run.workshopSlug = WORKSHOP_SLUG;
        });
        return state;
      } catch (_error) {
        return createEmptyLocalState(this.config);
      }
    }

    writeState(state) {
      if (!this.persistent) {
        this.memoryState = clone(state);
        return;
      }
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        throw new STEMQuestStorageError(
          "This device could not save the workshop progress.",
          "local_write_failed",
          error
        );
      }
    }

    async joinStudent(input) {
      const details = validateJoinInput(input);
      const slug = (input && input.workshopSlug) || this.workshopSlug;
      workshopDefinition(slug);
      const resumeToken = randomToken(32);
      const resumeTokenHash = await hashToken(resumeToken);
      // Read after asynchronous hashing so concurrent joins cannot overwrite
      // another student's freshly saved run with an older state snapshot.
      const state = this.readState();
      const workshop = state.workshops[slug];
      if (!workshop || !workshop.active || details.classCode !== workshop.classCode) {
        throw new STEMQuestStorageError("That workshop code is not active.", "workshop_not_found");
      }
      const runId = randomId();
      const now = new Date().toISOString();
      const run = {
        runId,
        workshopId: workshop.id,
        workshopSlug: workshop.slug,
        classCode: workshop.classCode,
        workshopTitle: workshop.title,
        nickname: details.nickname,
        gradeLevel: details.gradeLevel,
        groupNumber: details.groupNumber,
        resumeTokenHash,
        introCompleted: false,
        prediction: null,
        experimentSteps: {},
        observationResult: null,
        observationTags: [],
        observationText: null,
        reflections: {},
        postCheckAnswer: null,
        understandingRating: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      state.runs[runId] = run;
      this.writeState(state);
      return { run: publicRun(run), resumeToken };
    }

    async getStudentRun(input) {
      const runId = cleanString(input && input.runId, 80);
      const resumeToken = cleanString(input && input.resumeToken, 256);
      const resumeTokenHash = await hashToken(resumeToken);
      const state = this.readState();
      const run = state.runs[runId];
      if (!run || !resumeToken || resumeTokenHash !== run.resumeTokenHash) {
        throw new STEMQuestStorageError("Workshop progress could not be resumed.", "resume_denied");
      }
      return publicRun(run);
    }

    async saveStudentRun(input) {
      const runId = cleanString(input && input.runId, 80);
      const resumeToken = cleanString(input && input.resumeToken, 256);
      const resumeTokenHash = await hashToken(resumeToken);
      const state = this.readState();
      const run = state.runs[runId];
      if (!run || !resumeToken || resumeTokenHash !== run.resumeTokenHash) {
        throw new STEMQuestStorageError("Workshop progress could not be saved.", "resume_denied");
      }
      const changes = sanitizePatch(input && (input.changes || input.patch), workshopDefinition(run.workshopSlug));

      Object.keys(changes).forEach((field) => {
        if (field === "completed") {
          if (changes.completed && !run.completedAt) run.completedAt = new Date().toISOString();
          return;
        }
        run[field] = changes[field];
      });
      run.updatedAt = new Date().toISOString();
      state.runs[runId] = run;
      this.writeState(state);
      return publicRun(run);
    }

    async getClassSummary(classCode) {
      const normalized = normalizeClassCode(classCode);
      const state = this.readState();
      const workshop = Object.values(state.workshops).find((entry) => entry.classCode === normalized);
      if (!workshop || !workshop.active) {
        return emptySummary(normalized);
      }
      return summarize(workshop, Object.values(state.runs).filter((run) => run.workshopId === workshop.id));
    }

    async getOrganizerReport(input) {
      const classCode = normalizeClassCode(input && input.classCode);
      const pin = cleanString(input && input.pin, 128);
      const expectedPin = cleanString(this.config.LOCAL_ORGANIZER_PIN || "2468", 128);
      if (!pin || pin !== expectedPin) {
        throw new STEMQuestStorageError("Organizer PIN is incorrect.", "organizer_denied");
      }

      const state = this.readState();
      const workshop = Object.values(state.workshops).find((entry) => entry.classCode === classCode);
      if (!workshop) {
        throw new STEMQuestStorageError("That workshop could not be found.", "workshop_not_found");
      }
      const runs = Object.values(state.runs).filter((run) => run.workshopId === workshop.id);
      return {
        workshop: clone(workshop),
        summary: summarize(workshop, runs),
        responses: runs.map(publicRun),
      };
    }
  }

  class SupabaseRestAdapter {
    constructor(config) {
      this.mode = "supabase";
      this.persistent = true;
      this.workshopSlug = config.WORKSHOP_SLUG || WORKSHOP_SLUG;
      this.runWorkshops = new Map();
      this.url = String(config.SUPABASE_URL).replace(/\/+$/, "");
      this.anonKey = String(config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY).trim();
      this.schema = cleanString(config.SUPABASE_SCHEMA || "public", 64) || "public";
      this.timeoutMs = Number(config.REQUEST_TIMEOUT_MS) || 12000;
    }

    async rpc(functionName, payload) {
      const controller = typeof global.AbortController === "function" ? new global.AbortController() : null;
      const timeout = controller
        ? global.setTimeout(() => controller.abort(), this.timeoutMs)
        : null;

      try {
        const response = await global.fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
          method: "POST",
          headers: {
            apikey: this.anonKey,
            // Publishable keys are opaque API keys, not JWT bearer tokens.
            ...(this.anonKey.startsWith("sb_publishable_") ? {} : { Authorization: `Bearer ${this.anonKey}` }),
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Profile": this.schema,
            "Content-Profile": this.schema,
          },
          body: JSON.stringify(payload || {}),
          signal: controller ? controller.signal : undefined,
        });

        const text = await response.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (_error) {
            data = text;
          }
        }

        if (!response.ok) {
          const message = data && typeof data === "object" && data.message
            ? data.message
            : "The workshop service could not complete that request.";
          throw new STEMQuestStorageError(message, `remote_${response.status}`);
        }

        // PostgREST normally returns a scalar jsonb RPC as an object. This also
        // accepts the single-row array shape used by some proxy configurations.
        if (Array.isArray(data) && data.length === 1) return data[0];
        return data;
      } catch (error) {
        if (error instanceof STEMQuestStorageError) throw error;
        if (error && error.name === "AbortError") {
          throw new STEMQuestStorageError("The workshop service took too long to respond.", "remote_timeout", error);
        }
        throw new STEMQuestStorageError("The workshop service is currently unreachable.", "remote_unreachable", error);
      } finally {
        if (timeout) global.clearTimeout(timeout);
      }
    }

    async joinStudent(input) {
      const details = validateJoinInput(input);
      const slug = (input && input.workshopSlug) || this.workshopSlug;
      workshopDefinition(slug);
      const resumeToken = randomToken(32);
      const run = await this.rpc("stemquest_join_student", {
        p_class_code: details.classCode,
        p_nickname: details.nickname,
        p_grade_level: details.gradeLevel,
        p_group_number: details.groupNumber,
        p_resume_token: resumeToken,
        p_workshop_slug: slug,
      });
      if (run && run.runId) this.runWorkshops.set(run.runId, slug);
      return { run, resumeToken };
    }

    async getStudentRun(input) {
      const run = await this.rpc("stemquest_get_student_run", {
        p_run_id: cleanString(input && input.runId, 80),
        p_resume_token: cleanString(input && input.resumeToken, 256),
      });
      if (run && run.runId && run.workshopSlug) this.runWorkshops.set(run.runId, run.workshopSlug);
      return run;
    }

    async saveStudentRun(input) {
      return this.rpc("stemquest_save_student_run", {
        p_run_id: cleanString(input && input.runId, 80),
        p_resume_token: cleanString(input && input.resumeToken, 256),
        p_payload: sanitizePatch(input && (input.changes || input.patch), workshopDefinition(this.runWorkshops.get(input && input.runId) || this.workshopSlug)),
      });
    }

    async getClassSummary(classCode) {
      return this.rpc("stemquest_class_summary", {
        p_class_code: normalizeClassCode(classCode),
      });
    }

    async getOrganizerReport(input) {
      return this.rpc("stemquest_organizer_report", {
        p_class_code: normalizeClassCode(input && input.classCode),
        p_pin: cleanString(input && input.pin, 128),
      });
    }
  }

  function remoteIsConfigured(config) {
    const url = cleanString(config.SUPABASE_URL, 500);
    const key = cleanString(config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY, 4000);
    return /^https:\/\/[a-z0-9.-]+$/i.test(url.replace(/\/+$/, "")) && key.length >= 40;
  }

  function createStorage(overrides) {
    const config = Object.assign({}, global.STEMQUEST_CONFIG || {}, overrides || {});
    return remoteIsConfigured(config)
      ? new SupabaseRestAdapter(config)
      : new LocalStorageAdapter(config);
  }

  global.STEMQuestStorage = Object.freeze({
    create: createStorage,
    createStorage,
    StorageError: STEMQuestStorageError,
    PHOTO_POLICY: "local-preview-only",
    PREDICTIONS: Object.freeze(Array.from(PREDICTIONS)),
    OBSERVATION_RESULTS: Object.freeze(Array.from(OBSERVATION_RESULTS)),
    OBSERVATION_TAGS: Object.freeze(Array.from(OBSERVATION_TAGS)),
  });
})(window);
