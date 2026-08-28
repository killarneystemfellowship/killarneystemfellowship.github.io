# STEMQuest DNA storage

This folder contains the optional shared backend for **STEMQuest: DNA Discovery Lab**. The student experience works immediately with browser `localStorage`; Supabase is only required when responses must be shared across classroom devices and shown in an organizer report.

## Storage modes

Load the scripts in this order:

```html
<script src="stemquest-config.js"></script>
<script src="storage.js"></script>
```

Then create the adapter:

```js
const storage = window.STEMQuestStorage.create();
console.log(storage.mode); // "local" or "supabase"
```

When either Supabase setting is blank, `storage.js` uses `localStorage`. The local demo accepts class code `DNA-DEMO` and organizer PIN `2468`. Local mode is useful for UI testing on one browser only; it cannot combine responses from different phones or iPads.

When both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set, the same methods use Supabase's REST API. No Supabase JavaScript SDK is loaded.

## Browser API

```js
const { run, resumeToken } = await storage.joinStudent({
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
- `prediction` — `clear-liquid`, `white-stringy-material`, `small-crystals`, or `nothing-visible`
- `experimentSteps` — JSON object containing step completion and optional notes
- `observationResult` — `yes`, `somewhat`, or `no`
- `observationTags` — an array containing `white`, `cloudy`, `stringy`, `clumpy`, `web-like`, and/or `no-visible-change`
- `observationText` — up to 2,000 characters
- `reflections` — JSON object containing the reflection answers
- `postCheckAnswer` — short structured post-lab answer
- `understandingRating` — integer from 1 through 5
- `completed` — boolean; `true` timestamps completion and cannot be reversed from the public API

The class summary contains counts only. Common-observation totals are returned in `observationTagCounts`; group-level extraction results use `groupObservationCount` and `successfulGroupCount` so multiple students in one group do not inflate the result.

## Supabase setup

1. Create a Supabase project.
2. Open its **SQL Editor** and run [`supabase.sql`](supabase.sql) in full.
3. Replace the example class code and PIN with values used for the live workshop. Use a long random PIN that is not shared with students:

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
   where slug = 'dna-discovery-lab';
   ```

   The seed session is deliberately inactive and uses a publicly known placeholder PIN. Do not activate it without changing the PIN.

   Class codes do not rotate automatically. Create one session for each new
   class and give it a unique public code and a separate private organizer PIN:

   ```sql
   insert into public.stemquest_workshop_sessions (
     slug,
     class_code,
     title,
     organizer_pin_hash,
     is_active
   ) values (
     'dna-discovery-lab',
     'DNA-ROOM14',
     'STEMQuest: DNA Discovery Lab',
     extensions.crypt(
       'replace-with-a-different-long-random-pin',
       extensions.gen_salt('bf')
     ),
     true
   );
   ```

   Share only the class code with students. Chapter organizers use that same
   class code plus its private PIN in the dashboard. When the class is over,
   close it without deleting its report:

   ```sql
   update public.stemquest_workshop_sessions
   set is_active = false, updated_at = timezone('utc', now())
   where class_code = 'DNA-ROOM14';
   ```

4. In **Project Settings → API**, copy the project URL and the public `anon` key into `../stemquest-config.js`:

   ```js
   SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
   SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY",
   ```

5. Do **not** place a service-role key, database password, or organizer PIN in this repository. The anon key is public by design; the SQL permissions and RPC validation provide the protection.
6. Test joining, saving, refreshing/resuming, class counts, and the organizer report before using the QR code in a classroom.

GitHub Pages has no server-side environment variables. Even if a build secret injected the anon key, browsers would still see it. The anon key therefore belongs in the client configuration, while all privileged credentials stay in Supabase.

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
  where slug = 'dna-discovery-lab'
);
```

This delete is intentionally unavailable through the public REST API.
