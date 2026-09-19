# SCOPE Software Plan

## Product

**SCOPE** is a mobile-first companion for Killarney STEM Fellowship's five live biology workshops: Strawberry DNA, Yeast Balloons, The Human Engine, Bubbling Leaves, and Bird Beaks. SCOPE stands for **STEM Connections & Outreach for Primary Education**.

It supports the physical experiment as:

- a digital lab notebook;
- an interactive learning guide;
- a reflection tool; and
- a simple classroom impact tracker.

The current prototype supports all five workshops through a shared student experience and workshop-specific lesson content. The existing DNA address remains available, and a lab selector opens each module.

The secure classroom access model, authenticated adult accounts, personal student QR credentials, and optional AI features below remain delivery requirements; adding workshop content does not make these planned safeguards implemented.

## Goals

The MVP should allow a teacher or chapter organizer to:

1. Sign in as an approved teacher or chapter organizer.
2. Create a class session and add an approved roster or anonymous participant list.
3. Generate a private, revocable QR card for each student.
4. Let students join without creating permanent accounts, passwords, or email addresses.
5. Guide students through predictions, experiment checkpoints, observations, analysis, and reflection.
6. Show safe class-level results during the workshop.
7. Review and export an organizer report afterward.

The student experience should be fast, elementary-friendly, accessible, and usable on phones and school iPads.

## Non-goals for the first release

- Student accounts, passwords, or email addresses
- A full learning-management system
- Automated grading or high-stakes assessment
- A general-purpose authoring system for workshops beyond the five reviewed biology modules
- Public student profiles or leaderboards
- Remote storage of student photos
- An unrestricted, general-purpose student chatbot
- Automated "at-risk" labels, diagnoses, grades, or decisions about students

## Users

### Student

A student does not type a name to recover or open an existing record. Before the workshop, the teacher creates or imports the approved participant list and SCOPE generates one private QR credential per student.

The student's QR credential connects them to:

- a private student reference;
- a teacher-approved name or display name, when collection has been approved;
- grade level;
- class session; and
- group number.

No permanent student account, email address, or password is required. Scanning the personal QR establishes a workshop-scoped session, and a separate browser resume token makes returning on the same device convenient. The personal QR can restore access on another device. Teachers can revoke and regenerate it without deleting the student's work.

A public workshop code may open the correct activity or allow an anonymous guest run, but it must never retrieve a named student's record. If a school has not approved collection of names, SCOPE uses anonymous participant labels and restricts insights to class-level patterns.

### Teacher or organizer

An approved teacher or chapter organizer signs in through Supabase Auth using an emailed magic link or one-time code. Public self-registration is disabled. Their dashboard permissions are limited to assigned sessions.

The dashboard allows them to:

- create a session and manage its roster;
- generate, print, revoke, and reset personal student QR credentials;
- view the public class link and presentation view;
- monitor participation and completion;
- view prediction and observation totals;
- review reflection responses;
- export CSV or JSON reports;
- optionally generate an anonymized AI class summary;
- review evidence-based **follow-up signals** for individual students; and
- see which named student a signal belongs to without sending that name to the AI provider.

## Student flow

The shared prototype provides the lesson screens for every workshop. The personal-QR join and optional AI coach described below are the intended secure classroom flow, not current prototype authentication or AI capabilities.

1. **Join workshop**
   - Scan a teacher-issued personal QR credential.
   - Confirm the displayed first name or approved participant label without exposing the rest of the roster.
   - Save a browser-only resume token for convenient return on the same device.

2. **Introduction**
   - Select a workshop and learn its core concepts. The DNA module explains what DNA is, where it is found, and how it is used in medicine, forensics, and genetics research; other modules cover the science in the workshop catalog below.

3. **Prediction**
   - Answer a question specific to the active experiment, such as “What do you think extracted strawberry DNA will look like?”
   - Submit one of four structured choices.
   - View safe aggregate class predictions.

4. **Experiment guide**
   - Follow the active workshop's five checkpoints.
   - For DNA: mash strawberries, add extraction solution, filter the mixture, add cold alcohol, and observe DNA strands.
   - Mark each step complete and optionally record notes.

5. **Observation**
   - Record the active workshop's result and measurements.
   - For DNA: report whether DNA was visible and select observation tags such as white, cloudy, stringy, clumpy, or web-like.
   - Add an optional written observation.
   - A selected photo may be previewed locally but is not uploaded.

6. **Analysis**
   - View group counts, workshop-specific outcomes, common observations, and prediction results.
   - Complete a short post-lab knowledge check and understanding rating.

7. **Reflection**
   - Answer the four science reflection questions for the active workshop.

8. **Optional AI Lab Coach**
   - Ask for a simpler explanation, a hint, or a guiding question.
   - Receive help grounded only in the approved content of the active workshop.
   - See a reminder that AI can make mistakes and that the teacher or presenter is the final source of help.

9. **Completion badge**
   - Receive the active workshop's completion badge, such as DNA Explorer.
   - A completed run should offer a clear **Start another lab** option instead of only showing **Resume my lab**.

## Teacher and organizer flow

1. Sign in through Supabase Auth.
2. Create a new workshop session.
3. Add a teacher-approved roster manually or by CSV, or choose anonymous participant mode.
4. Generate and privately distribute personal QR cards.
5. Open the session and, if useful, display the public activity link or class code.
6. Lock new joins after attendance is confirmed.
7. Monitor safe aggregate results during the activity.
8. Review individual work, teacher-reviewed AI signals, and exports after the activity.
9. Reset a student's credential when device access is lost or a QR is exposed.
10. Close the session after the workshop without immediately deleting its report.

The public workshop code is a session locator, not an authentication credential. Personal QR credentials are random, stored only as hashes, scoped to one session, rate-limited, revocable, and never listed publicly. Named records and individual answers require an authenticated adult assigned to that session.

## Technical architecture

```text
GitHub Pages
  ├── Existing Killarney STEM Fellowship website
  ├── /stemquest/dna/          Shared student experience and lab selector
  └── /stemquest/dna/admin/    Shared organizer dashboard
             │
             ▼
        SCOPE storage adapter
        ├── localStorage demo mode
        └── Supabase REST/RPC mode
                    │
                    ▼
        Supabase Auth + Postgres
                    │
                    ▼
         Secured Supabase Edge Functions
                    │
                    ▼
       Optional OpenAI API for approved tools
```

The website remains static HTML, CSS, and JavaScript. No build framework is required.

## Current implementation

The repository already contains:

- `stemquest/dna/index.html` — student interface;
- `stemquest/dna/stemquest.css` — responsive SCOPE prototype design system;
- `stemquest/dna/app.js` — student flow and interaction logic;
- `stemquest/dna/workshops.js` — the five workshop definitions, lesson content, and module-specific inputs;
- `stemquest/dna/storage.js` — local and Supabase storage adapter;
- `stemquest/dna/stemquest-config.js` — public runtime configuration;
- `stemquest/dna/admin/index.html` — organizer dashboard;
- `stemquest/dna/admin/admin.js` — dashboard behaviour;
- `stemquest/dna/backend/supabase.sql` — database schema and secured RPC functions; and
- `stemquest/dna/backend/README.md` — detailed backend setup instructions.

Each workshop uses the shared route `/stemquest/dna/?lab=<slug>`, with slugs `dna-discovery-lab`, `yeast-balloon-lab`, `human-engine-lab`, `bubbling-leaves-lab`, and `bird-beak-lab`. The original `/stemquest/dna/` address defaults to DNA.

Until Supabase credentials are configured, the prototype runs in single-browser `localStorage` mode with workshop-specific demo data and class codes; the existing DNA demo class code remains `DNA-DEMO`. Local runs and resume state must remain separated by workshop. Configured Supabase deployments need the matching multi-workshop SQL migration before using the new modules.

### Implementation gap before live use

The checked-in prototype still uses class-code, organizer-PIN, and typed-name flows, which are demonstration behaviour only. Before any real or identifiable student data is collected, the implementation must be migrated to:

- authenticated teacher and organizer accounts;
- session assignments and database Row Level Security;
- teacher-managed rosters or anonymous participant lists;
- hashed, revocable personal student QR credentials;
- a public view limited to non-identifying aggregates; and
- secured, authenticated Edge Functions for individual reports and AI features.

## Planned secure database design

### `scope_adult_profiles`

Extends Supabase Auth for approved adults:

- authenticated user ID;
- display name;
- role: teacher, organizer, or administrator;
- active/inactive state; and
- timestamps.

### `scope_workshop_sessions`

Stores one record per class session:

- unique ID;
- workshop slug;
- optional public class code used only as a session locator;
- workshop title;
- anonymous or named-participant mode;
- active/inactive state;
- join-open/join-locked state;
- optional opening and closing times; and
- timestamps.

### `scope_session_staff`

Defines which authenticated adults may access a session:

- session reference;
- authenticated adult reference;
- permission level; and
- timestamps.

### `scope_student_identity`

Stores the minimum approved identity information separately from learning records:

- private student reference;
- session reference;
- student name or anonymous participant label;
- grade and group number;
- created timestamp; and
- deletion timestamp.

Only authenticated adults assigned to the session may read this table. AI requests use the private student reference, never the student's name.

### `scope_student_access_credentials`

Stores workshop-scoped access without creating a permanent student account:

- student reference;
- hash of the personal QR credential;
- credential version;
- active/revoked state;
- failed-attempt and rate-limit metadata;
- last-used timestamp; and
- expiry timestamp.

The unencrypted credential is shown only when the teacher generates or resets a QR card. Resetting a credential invalidates the previous version without changing the student's work.

### `scope_student_runs`

Stores one student's workshop run:

- session reference;
- private student reference;
- hash of the browser resume token;
- introduction completion;
- prediction;
- experiment-step state and notes;
- observation result and tags;
- observation text;
- reflection answers;
- post-lab knowledge answer;
- understanding rating;
- completion timestamp; and
- created/updated timestamps.

The dashboard joins a response to the identity table only after access has been authorized. The AI layer never receives the identity table.

## Security and privacy

SCOPE is used by minors, so privacy is a product requirement rather than a later enhancement.

### Required safeguards

- Collect student names only after the school has approved the purpose, notice, access, retention, and deletion process. Keep an anonymous display-name mode available.
- Do not collect student emails, phone numbers, or school IDs.
- Store identity separately from workshop answers and never include names in AI requests.
- Do not upload student photos in the MVP.
- Do not place database passwords, Supabase secret/service-role keys, personal QR credentials, or AI keys in GitHub.
- Require Supabase Auth for every named roster, individual response, export, credential-management action, and teacher-facing AI insight.
- Disable public adult registration and allow access only to invited, approved teachers and chapter members.
- Apply Row Level Security so an authenticated adult sees only assigned sessions.
- Permit browser access only through narrowly scoped database functions.
- Return only non-identifying counts from the public class-summary endpoint.
- Never accept a name plus workshop code as a recovery method.
- Never return an existing student record in response to a public workshop code.
- Hash personal QR and resume credentials, rate-limit attempts, and support immediate teacher revocation.
- Close sessions after workshops.
- Define a deletion schedule before collecting live student data.
- Avoid showing individual student answers on a projected public screen.
- Restrict named student records and individual support signals to authorized adults who are directly involved in the workshop.
- Record when an organizer generates or reviews an AI insight.

The Supabase publishable key can be included in browser configuration only because direct table access is denied and secured functions validate every operation. Supabase secret keys and the OpenAI key remain server-side secrets.

## Optional AI insights

AI is not required for core SCOPE functionality. Charts, prediction accuracy, observation totals, quiz results, and completion rates should always be calculated normally.

### Teacher dashboard: follow-up support

The dashboard may offer two organizer-controlled actions:

**Generate class insights**

It may return:

- common themes in reflections;
- common misconceptions;
- suggested follow-up discussion questions; and
- a short workshop-impact summary.

**Find responses to review**

This does not classify a student as "at risk." It highlights specific evidence that may deserve a teacher's attention, such as:

- an incomplete response pattern;
- a repeated misconception about the active workshop's science or experiment;
- a very low self-reported understanding rating; or
- a reflection that asks for help.

Every signal must show the source response and a short reason. The dashboard labels it **May benefit from follow-up**, allows the teacher to dismiss it, and never triggers an automatic grade, intervention, message, or decision. The teacher remains responsible for interpreting the student's work in context.

### Student side: Workshop Lab Coach

The student experience may include a constrained AI helper with a small set of actions:

- **Explain this another way**
- **Give me a hint**
- **Ask me a guiding question**
- **Help me reflect on my observation**

The planned Lab Coach is grounded in chapter-approved material for the active workshop. It should guide thinking instead of supplying reflection answers, and it must not provide medical advice, evaluate the student, assign a risk label, or act as a general chatbot. Students can complete the entire lab without using it.

### AI rules

- Generate at most one cached summary per class unless the organizer explicitly refreshes it.
- Send no student name, display name, workshop code, personal QR credential, group number, photo, or school identifier.
- Use a random student reference when individual-response analysis is needed, then join it to the student's name inside the secured dashboard.
- Remove identifying details that students type into free-text answers before sending them to an AI service.
- Do not let AI assign grades or make decisions about students.
- Never describe a student as "at risk" based only on AI output; use reviewable follow-up signals tied to evidence.
- Keep student-facing help within approved workshop content and visibly label it as AI-generated.
- Select a versioned, educator-approved knowledge package for the active workshop; never mix content from different workshop modules.
- Do not show teacher-facing support signals to students or classmates.
- Keep a non-AI report available if the AI service is unavailable.
- Limit prompt size and output length to control cost.
- Store the model version, prompt version, timestamp, and organizer review state for each generated insight.

### Recommended deployment

Store the OpenAI key as a Supabase Edge Function secret. The browser calls the Edge Function, and the function validates organizer access before calling the AI API.

For development, a free provider tier may be used with synthetic responses. For live workshops, the recommended approach is a small prepaid OpenAI balance with automatic recharge disabled.

## Workshop catalog

**Content updated:** September 17, 2026. **Source:** all five tabs of the [current biology lesson plan](https://docs.google.com/document/d/1Xjb3_ISZh8sjFmNIQ8zUPuZOZ-9kIf13BCRz58v1Pfw/edit?tab=t.0). All five modules are in the prototype scope. Each uses the shared prediction, checkpoint, observation, reflection, badge, and class-results components with its own content and input fields. Secure student access and teacher-insight components remain planned as described above.

The current source already contains the yeast experiment and microorganism reflections, plus the bird-beak simulation and evolution reflections. Earlier notes describing those tabs as copied DNA material are obsolete. The source still contains three DNA questions in the heart workshop; the replacements below were explicitly approved by the user. The photosynthesis objective is corrected below, and the unfinished “Healing the human body -” line is excluded from student content pending a defined, reviewed explanation.

### 1. DNA Discovery Lab — prototype module

- **Audience:** Grades 3–5
- **Length:** Approximately 45–50 minutes
- **Learning goal:** Understand what DNA is, where it is found, why it matters, and how a simple extraction makes it visible.
- **Science topics:** DNA structure at an age-appropriate level, base pairing, laboratory extraction, forensics, genetics research, personalized medicine, and a carefully simplified introduction to CRISPR-Cas9.
- **Materials:** Strawberries, ziplock bags, dish soap, salt, water, coffee filters, cups, rubbing alcohol, wooden sticks, spoons, and a device for the lab and feedback.
- **Physical activity:** Mash strawberries, add soap-and-salt extraction solution, filter the mixture, add cold alcohol, and collect visible white DNA strands.
- **SCOPE interactions:** Predict the result, complete five experiment checkpoints, record visible strands and observation tags, compare class results, answer reflection questions, and earn the DNA Explorer badge.
- **Content review:** Confirm that base-pair and gene-editing explanations are suitable for Grades 3–5 and distinguish simplified models from the full science.

**Science reflections:**

1. What is DNA and where is it found?
2. Why did we mash the strawberries?
3. What did the white stringy substance represent?
4. Why do scientists study DNA?

### 2. Yeast Balloon Lab — prototype module

- **Audience:** Grades 6–7
- **Length:** Approximately 45–50 minutes
- **Learning goal:** Recognize yeast as a living microorganism and connect sugar use, cellular respiration or fermentation, and carbon-dioxide production.
- **Science topics:** Microorganisms, living-cell processes, fermentation, respiration, experimental controls, variables, and fair comparisons.
- **Materials:** Empty water bottles, balloons, active dry yeast, sugar, warm water, measuring spoons, permanent markers, and a device.
- **Physical activity:** Compare a bottle containing yeast, warm water, and sugar with a control bottle containing yeast and warm water; observe and record balloon inflation over approximately 15–20 minutes as carbon dioxide accumulates.
- **SCOPE interactions:** Predict which balloon will inflate, identify the control, record timed observations or balloon measurements, compare groups, explain the carbon-dioxide source, and reflect on useful microorganisms in food production.
- **Content review:** Use the current source's microorganism content. Distinguish yeast (a fungus) from bacteria, and avoid calling viruses living cells. Keep the comparison conditions the same apart from added sugar. Treat the expected difference in balloon inflation as a prediction to investigate, not a guaranteed result.

**Science reflections:**

1. What are microorganisms, and is yeast alive?
2. Why did the balloon with sugar inflate more than the control, or what could explain a different result?
3. What gas caused the balloon to inflate, and where did it come from?
4. How are microorganisms used to create different types of beverages and food products?

### 3. The Human Engine — prototype module

- **Audience:** Grades 6–7
- **Length:** Approximately 45–50 minutes
- **Learning goal:** Connect heart rate with the body's changing demand for oxygen and learn how a simple stethoscope helps make heart sounds observable.
- **Science topics:** Heart function, circulation, arteries and veins, oxygen and nutrient transport, heart-rate measurement, heart sounds, wearables, sports science, and clinical listening tools.
- **Materials:** Stopwatches or phone timers, recording sheets, funnels, plastic balloons, aquarium tubing, a Y connector, scissors, and a device.
- **Physical activity:** Build a simple stethoscope from a funnel and tubing, listen to a partner's resting heartbeat and identify the “lub-dub” sounds, take part in a short teacher-led activity, then immediately measure and compare resting and post-activity rates in beats per minute.
- **SCOPE interactions:** Predict how activity changes heart rate, record anonymous or demonstration measurements before and after activity, compare results, identify measurement limitations, and reflect on the “lub-dub” valve sounds. Any richer before-and-after graphing remains a future presentation enhancement unless explicitly implemented.
- **Privacy and safety:** Do not use AI to infer health conditions or risk from heart-rate data. Default to anonymous or group-level measurements, provide a non-exercise participation option, sanitize shared listening equipment, and obtain school approval before storing any named physiological measurement.
- **Content correction:** Keep the source's first reflection and replace its three copied DNA questions with the approved heart-rate questions below. Explain that the sounds are associated with valves closing and that heart rate increases during activity to deliver more oxygen to muscles. See [NHLBI: How the Heart Beats](https://www.nhlbi.nih.gov/health/heart/heart-beats). Avoid presenting classroom measurements as health assessments.

**Science reflections:**

1. What did the “lub-dub” sound represent, and what part of the heart makes it?
2. How did your heart rate change after activity compared with rest?
3. Why do working muscles need the heart to deliver more oxygen during activity?
4. How could you make your heart-rate measurements more reliable?

### 4. Bubbling Leaves Lab — prototype module

- **Audience:** Grades 6–7
- **Length:** Approximately 45–50 minutes
- **Learning goal:** Understand that plants use light energy, carbon dioxide, and water to make sugars that store chemical energy, releasing oxygen as a by-product, and connect photosynthesis to the lives of plants and animals.
- **Science topics:** Photosynthesis, plant energy storage, oxygen production, carbon dioxide, light availability, ecosystems, and renewable-energy research.
- **Materials:** Elodea (Anacharis) sprigs, clear cups, baking soda, bright lamps, iPad flashlights or sunlight, scissors, a timer, and a device.
- **Physical activity:** Trim an Elodea stem at an angle, place it in water with a pinch of baking soda, illuminate it, and count bubbles per minute over approximately 10–15 minutes. If time allows, compare with a second cup in shade or a dark box.
- **SCOPE interactions:** Predict the effect of light, record bubble counts, compare light and shade when a shaded trial is available, discuss measurement limitations, and reflect on why photosynthesis supports other life. Bubble-count time-series graphing is an optional later enhancement.
- **Content correction:** The source's objective incorrectly describes carbon dioxide as a product. The corrected objective above follows [NOAA's explanation of photosynthesis](https://gml.noaa.gov/outreach/terms.html). The source line “Healing the human body -” is unfinished and must not become an invented scientific claim; it remains excluded until the lesson author defines it and it is reviewed.

**Science reflections:**

1. What gas is being produced?
2. Why did we add baking soda to the solution?
3. Why would the shaded plant usually produce fewer bubbles than the plant in bright light?
4. Why does photosynthesis matter for life beyond the plant itself?

### 5. Bird Beak Natural Selection Lab — prototype module

- **Audience:** Grades 6–7
- **Length:** Approximately 45–50 minutes
- **Learning goal:** Understand how inherited variation and environmental conditions can change which traits become more common across generations.
- **Science topics:** Evolution, natural selection, variation, environmental pressure, comparative feeding success, populations, and the difference between individual adjustment and population-level change.
- **Materials:** Spoons, forks, chopsticks, plastic knives, small collection containers, marbles, larger feeding-ground containers, and a device.
- **Physical activity:** Use the tools as different model beaks and the feeding grounds as different environments. During timed rounds, collect marbles into small containers and record which beaks collect more in each environment.
- **SCOPE interactions:** Predict which beak will work best, record the tool and food collected, compare results, and explain how environments affect feeding success. A simulation of trait frequencies across generations would be an additional future extension, not part of the source's physical experiment.
- **Content review:** Use the current source's beak simulation and evolution questions. Review small-object safety, explain the limits of a single-round model, and ensure the explanation does not imply that individual animals choose or acquire evolutionary traits because they need them.

**Science reflections:**

1. What is natural selection?
2. How did natural selection influence different traits?
3. Why do different environments affect natural selection?
4. Why do scientists study evolution?

### Shared workshop-content requirements

Before any module is delivered to a real class:

- an educator or qualified subject reviewer approves the learning objective, explanations, questions, and vocabulary;
- presenters complete a physical safety and accessibility review;
- every external video or resource is verified as relevant, appropriate, and permitted for classroom use;
- copied placeholder material and unfinished claims are removed;
- the module defines its own prediction, checkpoints, observations, reflection questions, results calculations, and badge;
- physiological or otherwise sensitive data receives a separate privacy review;
- the non-AI experience is complete before an AI knowledge package is added; and
- AI prompts are grounded only in the active module's approved content.

## Delivery phases

### Phase 1 — Local prototype

- Provide all five workshop modules in the shared student flow, including the current source's four science reflections per module.
- Keep the existing DNA links and saved DNA runs compatible while separating each module's predictions, observations, measurements, and resume state.
- Fix badge-page mobile overlaps.
- Make completed sessions clearly distinguish **Start another lab** from **Resume my lab**.
- Confirm keyboard, touch, and reduced-motion behaviour.
- Test entirely with synthetic data in local mode.

### Phase 2 — Secure Supabase foundation

- Create the Supabase organization and SCOPE project.
- Replace the prototype SQL with the reviewed SCOPE identity, access-credential, session-assignment, and response schema.
- Enable Supabase Auth for invited adults using email magic links or one-time codes.
- Disable public adult registration and add teacher, organizer, and administrator roles.
- Configure the public project URL and publishable key.
- Add Row Level Security and least-privilege grants to every exposed table and function.
- Create a unique inactive test session for each workshop slug.
- Test roster import, personal QR issuance, join, resume, credential reset, completion, aggregation, authenticated reports, and exports across multiple devices.
- Confirm that direct anonymous table reads and writes fail.

### Phase 3 — Classroom pilot

- Establish consent, retention, and deletion procedures with the teacher/school.
- Use one small class with an authenticated teacher and privately distributed personal QR cards.
- Keep the AI features disabled during the first live pilot.
- Keep photos local-only.
- Observe usability rather than adding features during the workshop.
- Collect teacher and presenter feedback.
- Close the session and verify exports afterward.

### Phase 4 — Optional AI pilot

- Add the secured Edge Function.
- Use only synthetic data during initial testing.
- Add the organizer-facing class summary and response-review tools.
- Add the constrained student Lab Coach behind a teacher-controlled session setting.
- Pseudonymize inputs, remove typed identifying details, and cap input/output length.
- Cache the generated summary.
- Add failure and quota-exhaustion messaging.
- Require teacher review of every individual follow-up signal.
- Review student-facing prompts and outputs with an educator before enabling them in a live class.

### Phase 5 — Production hardening

- Add rate limiting and abuse protection.
- Add automated retention/deletion jobs.
- Add database backups appropriate to the program's needs.
- Conduct accessibility and privacy reviews.
- Consider workshop types beyond the current five only after the shared platform is stable.

## Testing checklist

### Student experience

- Open each of the five lab routes and confirm the title, grade band, 45–50-minute duration, concepts, materials, predictions, steps, observation fields, reflections, and badge match the selected module.
- Confirm the original DNA URL and saved DNA progress still work.
- Switch labs and confirm another lab's answers, resume token, and class results do not appear in the selected lab.
- Reject a class code for a different workshop instead of silently opening the wrong activity.
- Join with valid, invalid, expired, and revoked personal QR credentials.
- Confirm that typing another student's name can never retrieve an existing record.
- Confirm that the public workshop code cannot read or update an individual submission.
- Refresh and resume every step.
- Restore the same run on a second device using the personal QR.
- Reset a credential and confirm that the old QR immediately stops working.
- Prevent skipping required inputs.
- Complete all five lab checkpoints.
- Complete all four science reflections for every module; preserve existing DNA answers during schema changes.
- Verify aggregate prediction results update correctly.
- Verify group-based extraction success is not inflated by multiple students in one group.
- Complete and restart a second lab from the same device.
- Confirm the badge fits without text overlap on small phones.
- Confirm photo selection never creates a remote upload.

### Organizer dashboard

- Reject signed-out users and authenticated adults who are not assigned to the session.
- Invite, deactivate, and role-limit an adult account.
- Import a roster, generate QR cards, reset one credential, and lock new joins.
- Display correct student, group, completion, and understanding totals.
- Display observation tags and prediction distributions.
- Display module-specific measurements and field labels, without DNA labels in other labs.
- Export valid CSV and JSON.
- Copy the correct QR/join URL.
- Handle an empty class and an inactive class clearly.
- Confirm that public presentation mode contains no names or individual free-text responses.

### Accessibility and performance

- Complete the flow using only a keyboard.
- Verify visible focus indicators.
- Verify labels and status announcements with a screen reader.
- Test at 320 px mobile width and common iPad/desktop widths.
- Honour reduced-motion preferences.
- Avoid horizontal scrolling.
- Keep first-load assets small enough for school Wi-Fi.

## Launch criteria

The MVP is ready for a real classroom only when:

- Supabase is configured and tested across separate devices;
- invited teachers and organizers can authenticate and access only their assigned sessions;
- every named student receives a random, workshop-scoped personal QR credential that is stored only as a hash and can be revoked or reset;
- a public workshop code can locate an activity but cannot retrieve, create, or update a named student's record;
- old credentials stop working immediately after a teacher resets them;
- student progress survives a refresh;
- public endpoints cannot expose individual answers;
- Row Level Security prevents direct anonymous access to rosters, individual responses, exports, and AI insights;
- organizer totals match test submissions;
- the completion page works on mobile;
- the school has approved whether names may be collected and the teacher understands the privacy and deletion process;
- identity records are separated from learning responses and names never leave the secured application in AI requests;
- AI follow-up signals are advisory, evidence-linked, teacher-reviewed, and never used to make an automatic decision;
- any enabled student Lab Coach is grounded in approved content for the active workshop and can be disabled per session;
- the workshop works without AI; and
- a presenter has completed a full rehearsal using the actual QR code.

## Cost approach

- GitHub Pages hosting: free.
- Supabase: begin on the free plan and monitor storage and usage.
- Core SCOPE analytics: free, because calculations run in the application/database.
- Optional AI summary: use one short request per class and begin with a small prepaid balance.
- Student photos: no remote storage in the MVP.

## Future possibilities

After the five-module prototype and secure access model have been successfully piloted:

- additional workshops beyond the five modules described in this catalog;
- richer time-series charts for measurements and an optional multi-generation natural-selection model;
- additional authoring tools for adding reviewed workshop content without duplicating access, reporting, or privacy logic;
- reusable organizer session creation tools;
- teacher-facing PDF impact reports;
- curriculum-aligned question banks;
- bilingual content; and
- consented private photo storage with automatic deletion.
