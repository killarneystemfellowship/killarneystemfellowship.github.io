# Scope workshop storage

This folder contains the optional shared backend for all five **Scope** workshops. The student experience works immediately with browser `localStorage`; Supabase is required when responses must be shared across classroom devices and shown in an organizer report. The original `STEMQuestStorage` browser API, SQL function names, DNA slug, class codes, and resume tokens remain supported.

## Storage modes

Load the scripts in this order:

```html
<script src="stemquest-config.js"></script>
<script src="workshops.js"></script>
<script src="storage.js"></script>
```

Then create the adapter:

```js
const storage = window.STEMQuestStorage.create({ WORKSHOP_SLUG: "dna-discovery-lab" });
console.log(storage.mode); // "local" or "supabase"
```

When Supabase settings are blank, `storage.js` uses `localStorage`. The local organizer PIN is `2468`; the class codes below keep each lab's responses separate. Local mode is useful for UI testing on one browser only; it cannot combine responses from different phones or iPads.

| Workshop slug | Local class code |
| --- | --- |
| `dna-discovery-lab` | `DNA-DEMO` |
| `yeast-balloon-lab` | `YEAST-DEMO` |
| `human-engine-lab` | `HEART-DEMO` |
| `bubbling-leaves-lab` | `LEAF-DEMO` |
| `bird-beak-lab` | `BEAK-DEMO` |

When `SUPABASE_URL` and a public key are set, the same methods use Supabase's REST API. `SUPABASE_ANON_KEY` accepts either a legacy anon JWT or a publishable key; `SUPABASE_PUBLISHABLE_KEY` is also supported and takes precedence. Publishable keys are sent only in the `apikey` header, following [Supabase's API key documentation](https://supabase.com/docs/guides/getting-started/api-keys). No Supabase JavaScript SDK is loaded.

The shared `workshops.js` catalog supplies each lab's prediction IDs, observation tags, correct concept answer, and local class code. Existing DNA-only integrations can still load `storage.js` without the catalog.

## Browser API

```js
const { run, resumeToken } = await storage.joinStudent({
  workshopSlug: "dna-discovery-lab", // defaults to the adapter's lab, or DNA
  nickname: "BerryLab",
  gradeLevel: "Grade 5",
  classCode: "DNA-ROOM12",
  groupNumber: 3,
});

await storage.saveStudentRun({
  runId: run.runId,
  resumeToken,
  changes: {
    prediction: "white-stringy-material",
    observationResult: "yes",
    observationTags: ["white", "stringy"],
  },
});

const resumed = await storage.getStudentRun({ runId: run.runId, resumeToken });
const classCounts = await storage.getClassSummary("DNA-ROOM12");
const report = await storage.getOrganizerReport({
  classCode: "DNA-ROOM12",
  pin: organizerPin,
});
```

Allowed save fields are:

- `introCompleted` — boolean
- `prediction` — one of the selected lab's prediction IDs, or `null`
- `experimentSteps` — JSON object containing step completion and optional notes
- `observationResult` — `yes`, `somewhat`, or `no`
- `observationTags` — an array of the selected lab's observation tag IDs
- `observationText` — up to 2,000 characters
- `reflections` — JSON object containing the reflection answers; historical answer keys are retained
- `postCheckAnswer` — short structured post-lab answer
- `understandingRating` — integer from 1 through 5
- `completed` — boolean; `true` timestamps completion and cannot be reversed from the public API

`experimentSteps` also stores each lab's measurement values. Both JSON objects are limited to 12,000 UTF-8 bytes in PostgreSQL's JSON representation. Photo data and preview URLs are rejected in saved answer fields by both the browser and SQL RPC.

Returned runs and summaries include `workshopSlug`. The class summary contains counts only. Prediction totals use `predictionCounts`; observation totals use `observationTagCounts`. `groupObservationCount` and `successfulGroupCount` count distinct groups so multiple students in one group do not inflate results. DNA's original prediction counters remain available. `postCheckCorrectCount` uses the correct concept answer for that session's lab.

## Supabase setup

1. Create a Supabase project.
2. Open its **SQL Editor** and run [`supabase.sql`](supabase.sql) in full.
3. Replace the chosen example's class code and PIN with values used for the live workshop. Use a long random PIN that is not shared with students. For example, activate the DNA session:

   ```sql
   update public.stemquest_workshop_sessions
   set
     class_code = 'DNA-ROOM12',
     organizer_pin_hash = extensions.crypt(
       'replace-with-a-long-random-organizer-pin',
       extensions.gen_salt('bf')
     ),
     is_active = true,
     updated_at = timezone('utc', now())
   where class_code = 'DNA-DEMO';
   ```

   All five seed sessions are deliberately inactive and use a publicly known placeholder PIN. Do not activate one without changing its PIN. Target one unique class code when updating credentials, since multiple sessions may share a workshop slug.

   Class codes do not rotate automatically. Create one session for each new
   class and give it a unique public code and a separate private organizer PIN:

   ```sql
   insert into public.stemquest_workshop_sessions (
     slug, class_code, title, organizer_pin_hash, is_active,
     prediction_options, observation_tag_options, correct_post_check_answer
   )
   select
     slug, 'YEAST-ROOM14', title,
     extensions.crypt(
       'replace-with-a-different-long-random-pin',
       extensions.gen_salt('bf')
     ),
     true,
     prediction_options, observation_tag_options, correct_post_check_answer
   from public.stemquest_workshop_sessions
   where class_code = 'YEAST-DEMO';
   ```

   Share only the class code with students. Chapter organizers use that same
   class code plus its private PIN in the dashboard. When the class is over,
   close it without deleting its report:

   ```sql
   update public.stemquest_workshop_sessions
   set is_active = false, updated_at = timezone('utc', now())
   where class_code = 'YEAST-ROOM14';
   ```

4. Copy the project URL and public publishable (or legacy `anon`) key into `../stemquest-config.js`:

   ```js
   SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
   SUPABASE_ANON_KEY: "sb_publishable_YOUR_PUBLIC_KEY",
   ```

5. Do **not** place a service-role key, database password, or organizer PIN in this repository. The anon key is public by design; the SQL permissions and RPC validation provide the protection.
6. Test joining, saving, refreshing/resuming, class counts, and the organizer report before using the QR code in a classroom.

GitHub Pages has no server-side environment variables. Even if a build secret injected the anon key, browsers would still see it. The anon key therefore belongs in the client configuration, while all privileged credentials stay in Supabase.

## Upgrading an existing DNA backend

Run the complete `supabase.sql` before serving the updated shared-backend app. It is a rerunnable migration: existing student rows, resume-token hashes, PINs, active status, and class codes are preserved. New metadata defaults existing sessions to DNA's option IDs. The original five-argument `stemquest_join_student` call remains valid through the new optional sixth argument, `p_workshop_slug`, which defaults to `dna-discovery-lab`. The old function signature is replaced to avoid ambiguous PostgREST overloads.

Local storage keeps the original `ksf.stemquest.dna.v1` key and migrates its contents to a state containing separate workshop sessions. Existing DNA runs and their older reflection answers are retained. The first subsequent save writes the upgraded format.

## Verification

From the repository root, run the dependency-free browser storage contract tests:

```sh
node --test stemquest/dna/backend/storage.test.cjs
```

These cover all five labs, old local DNA migration, concurrent partial saves, class isolation, answer validation, request serialization, public key headers, error handling, and timeouts. [`smoke.sql`](smoke.sql) exercises the actual SQL RPCs as the `anon` role and rolls back its fixtures; run it only in a disposable test database after `supabase.sql`. The repository's database runner also checks a fresh schema, repeated migration, and preservation of an existing DNA session.

These checks validate local storage and PostgreSQL behavior. A live Supabase project still requires its schema migration, public configuration, and a classroom-device connection check.

## Security model

- Browser roles receive **no direct table privileges** and there are no public table RLS policies.
- Student writes use `stemquest_join_student`, `stemquest_get_student_run`, and `stemquest_save_student_run` RPCs.
- A 256-bit random resume token is created in the browser. Only its SHA-256 hash is stored remotely. Possession of both the run ID and token is required to read or update that run.
- `stemquest_class_summary` returns aggregate counts only—never nicknames, individual answers, reflection text, observation text, or tokens.
- `stemquest_organizer_report` returns individual responses only after checking the workshop's bcrypt organizer PIN.
- The PIN endpoint is intentionally simple for this first prototype. Use a long random PIN. If the organizer dashboard becomes public-facing or the program expands, replace PIN access with authenticated chapter-member accounts and rate limiting.

## Student photo policy

Photos are **local preview only** for this MVP. There is no photo column, upload RPC, or storage bucket. `storage.js` uses an explicit save-field allowlist, so file objects, data URLs, and photo fields are not sent to Supabase or written to `localStorage`.

For an on-device preview, create and later revoke an object URL without passing it to the storage adapter:

```js
const previewUrl = URL.createObjectURL(file);
previewImage.src = previewUrl;

// When the preview is removed or the page closes:
URL.revokeObjectURL(previewUrl);
```

Do not add remote student-photo storage without school approval, explicit consent, private access rules, and a defined deletion schedule.

## Resetting prototype data

Local mode can be reset from the browser console:

```js
localStorage.removeItem("ksf.stemquest.dna.v1");
```

To remove only the Supabase student runs while keeping the workshop configuration, use the SQL Editor:

```sql
delete from public.stemquest_student_runs
where workshop_id = (
  select id
  from public.stemquest_workshop_sessions
  where class_code = 'DNA-ROOM12'
);
```

This delete is intentionally unavailable through the public REST API.
