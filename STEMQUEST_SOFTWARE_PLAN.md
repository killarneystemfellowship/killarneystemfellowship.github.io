# SCOPE Software Plan

## Product

**SCOPE: DNA Discovery Lab** is a mobile-first companion for Killarney STEM Fellowship's live strawberry DNA extraction workshop. SCOPE stands for **STEM Connections & Outreach for Primary Education**.

It supports the physical experiment as:

- a digital lab notebook;
- an interactive learning guide;
- a reflection tool; and
- a simple classroom impact tracker.

The first release covers only the DNA Discovery Lab. It is not yet intended to be a general multi-workshop platform.

## Goals

The MVP should allow a teacher or chapter organizer to:

1. Create and open a class session.
2. Display a QR code or share a workshop link.
3. Let students join without creating accounts.
4. Guide students through predictions, experiment checkpoints, observations, analysis, and reflection.
5. Show safe class-level results during the workshop.
6. Review and export an organizer report afterward.

The student experience should be fast, elementary-friendly, accessible, and usable on phones and school iPads.

## Non-goals for the first release

- Student accounts, passwords, or email addresses
- A full learning-management system
- Automated grading or high-stakes assessment
- Multiple workshop types
- Public student profiles or leaderboards
- Remote storage of student photos
- An unrestricted, general-purpose student chatbot
- Automated "at-risk" labels, diagnoses, grades, or decisions about students

## Users

### Student

A student joins with:

- a student name or teacher-approved display name;
- grade level;
- class/workshop code; and
- group number.

No account is required. A private resume token stored in the browser allows the student to continue an interrupted session on the same device. Each school or teacher must be able to choose an anonymous display-name mode if collecting names has not been approved.

### Organizer

A chapter organizer uses the dashboard to:

- view the class QR code and join link;
- monitor participation and completion;
- view prediction and observation totals;
- review reflection responses;
- export CSV or JSON reports;
- optionally generate an anonymized AI class summary;
- review evidence-based **follow-up signals** for individual students; and
- see which named student a signal belongs to without sending that name to the AI provider.

## Student flow

1. **Join workshop**
   - Enter a student name or teacher-approved display name, grade, class code, and group number.
   - Save a browser-only resume token.

2. **Introduction**
   - Learn what DNA is, where it is found, and how it is used in medicine, forensics, and genetics research.

3. **Prediction**
   - Answer: “What do you think extracted strawberry DNA will look like?”
   - Submit one of four structured choices.
   - View safe aggregate class predictions.

4. **Experiment guide**
   - Mash strawberries.
   - Add extraction solution.
   - Filter the mixture.
   - Add cold alcohol.
   - Observe DNA strands.
   - Mark each step complete and optionally record notes.

5. **Observation**
   - Report whether DNA was visible.
   - Select observation tags such as white, cloudy, stringy, clumpy, or web-like.
   - Add an optional written observation.
   - A selected photo may be previewed locally but is not uploaded.

6. **Analysis**
   - View group counts, successful extractions, common observations, and prediction results.
   - Complete a short post-lab knowledge check and understanding rating.

7. **Reflection**
   - Answer the five workshop reflection questions.

8. **Optional AI Lab Coach**
   - Ask for a simpler explanation, a hint, or a guiding question.
   - Receive help grounded only in the approved DNA Discovery Lab content.
   - See a reminder that AI can make mistakes and that the teacher or presenter is the final source of help.

9. **Completion badge**
   - Receive the DNA Explorer badge.
   - A completed run should offer a clear **Start another lab** option instead of only showing **Resume my lab**.

## Organizer flow

1. Create a new workshop session in Supabase.
2. Assign a unique public class code and private organizer PIN.
3. Open the session before students join.
4. Share the QR code or student link.
5. Monitor aggregate results during the activity.
6. Review and export the report.
7. Close the session after the workshop without deleting its report.

Class codes and organizer PINs do not rotate automatically. Each class receives its own session record, code, and PIN.

## Technical architecture

```text
GitHub Pages
  ├── Existing Killarney STEM Fellowship website
  ├── /stemquest/dna/          Student experience
  └── /stemquest/dna/admin/    Organizer dashboard
             │
             ▼
      STEMQuest storage adapter
        ├── localStorage demo mode
        └── Supabase REST/RPC mode
                    │
                    ▼
              Supabase Postgres
                    │
                    ▼
        Optional Supabase Edge Function
                    │
                    ▼
              OpenAI API
```

The website remains static HTML, CSS, and JavaScript. No build framework is required.

## Current implementation

The repository already contains:

- `stemquest/dna/index.html` — student interface;
- `stemquest/dna/stemquest.css` — responsive STEMQuest design system;
- `stemquest/dna/app.js` — student flow and interaction logic;
- `stemquest/dna/storage.js` — local and Supabase storage adapter;
- `stemquest/dna/stemquest-config.js` — public runtime configuration;
- `stemquest/dna/admin/index.html` — organizer dashboard;
- `stemquest/dna/admin/admin.js` — dashboard behaviour;
- `stemquest/dna/backend/supabase.sql` — database schema and secured RPC functions; and
- `stemquest/dna/backend/README.md` — detailed backend setup instructions.

Until Supabase credentials are configured, the prototype runs in single-browser `localStorage` mode with the demo class code `DNA-DEMO`.

## Database design

### `stemquest_workshop_sessions`

Stores one record per class session:

- unique ID;
- workshop slug;
- unique class code;
- workshop title;
- hashed organizer PIN;
- active/inactive state;
- optional opening and closing times; and
- timestamps.

### `stemquest_student_runs`

Stores one student's workshop run:

- session reference;
- hashed resume token;
- private student reference, grade, and group number;
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

### `stemquest_student_identity`

Stores the minimum identity information needed for teacher follow-up, separately from workshop responses:

- private student reference;
- session reference;
- student name or approved display name;
- created timestamp; and
- deletion timestamp.

Only authenticated, authorized organizers may read this table. AI requests use the private student reference, never the student's name. The organizer dashboard joins a returned follow-up signal to the name only after the AI response is received.

## Security and privacy

SCOPE is used by minors, so privacy is a product requirement rather than a later enhancement.

### Required safeguards

- Collect student names only after the school has approved the purpose, notice, access, retention, and deletion process. Keep an anonymous display-name mode available.
- Do not collect student emails, phone numbers, or school IDs.
- Store identity separately from workshop answers and never include names in AI requests.
- Do not upload student photos in the MVP.
- Do not place database passwords, organizer PINs, Supabase service-role keys, or AI keys in GitHub.
- Permit browser access only through narrowly scoped database functions.
- Return only counts from the public class-summary endpoint.
- Require the class code and private organizer PIN for individual organizer reports.
- Use long, unique organizer PINs.
- Close sessions after workshops.
- Define a deletion schedule before collecting live student data.
- Avoid showing individual student answers on a projected public screen.
- Restrict named student records and individual support signals to authorized adults who are directly involved in the workshop.
- Record when an organizer generates or reviews an AI insight.

The public Supabase anonymous key can be included in browser configuration only because direct table access is denied and secured RPC functions validate every operation.

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
- a repeated misconception about DNA or the experiment;
- a very low self-reported understanding rating; or
- a reflection that asks for help.

Every signal must show the source response and a short reason. The dashboard labels it **May benefit from follow-up**, allows the teacher to dismiss it, and never triggers an automatic grade, intervention, message, or decision. The teacher remains responsible for interpreting the student's work in context.

### Student side: DNA Lab Coach

The student experience may include a constrained AI helper with a small set of actions:

- **Explain this another way**
- **Give me a hint**
- **Ask me a guiding question**
- **Help me reflect on my observation**

The Lab Coach is grounded in chapter-approved DNA workshop material. It should guide thinking instead of supplying reflection answers, and it must not provide medical advice, evaluate the student, assign a risk label, or act as a general chatbot. Students can complete the entire lab without using it.

### AI rules

- Generate at most one cached summary per class unless the organizer explicitly refreshes it.
- Send no student name, display name, class code, PIN, group number, photo, or school identifier.
- Use a random student reference when individual-response analysis is needed, then join it to the student's name inside the secured dashboard.
- Remove identifying details that students type into free-text answers before sending them to an AI service.
- Do not let AI assign grades or make decisions about students.
- Never describe a student as "at risk" based only on AI output; use reviewable follow-up signals tied to evidence.
- Keep student-facing help within approved workshop content and visibly label it as AI-generated.
- Do not show teacher-facing support signals to students or classmates.
- Keep a non-AI report available if the AI service is unavailable.
- Limit prompt size and output length to control cost.
- Store the model version, prompt version, timestamp, and organizer review state for each generated insight.

### Recommended deployment

Store the OpenAI key as a Supabase Edge Function secret. The browser calls the Edge Function, and the function validates organizer access before calling the AI API.

For development, a free provider tier may be used with synthetic responses. For live workshops, the recommended approach is a small prepaid OpenAI balance with automatic recharge disabled.

## Delivery phases

### Phase 1 — Local prototype

- Complete all student screens.
- Fix badge-page mobile overlaps.
- Make completed sessions clearly distinguish **Start another lab** from **Resume my lab**.
- Confirm keyboard, touch, and reduced-motion behaviour.
- Test entirely with synthetic data in local mode.

### Phase 2 — Supabase classroom storage

- Create the Supabase organization and SCOPE project.
- Run `stemquest/dna/backend/supabase.sql`.
- configure the public project URL and anonymous key;
- Create a unique inactive test session.
- Test join, save, resume, completion, aggregation, PIN access, and exports across multiple devices.
- Confirm that direct anonymous table reads and writes fail.

### Phase 3 — Classroom pilot

- Establish consent, retention, and deletion procedures with the teacher/school.
- Use one small class with a unique code and organizer PIN.
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

- Replace organizer PIN access with authenticated chapter-member accounts if usage expands.
- Add rate limiting and abuse protection.
- Add automated retention/deletion jobs.
- Add database backups appropriate to the program's needs.
- Conduct accessibility and privacy reviews.
- Consider additional workshop types only after the DNA Lab is stable.

## Testing checklist

### Student experience

- Join with valid and invalid codes.
- Refresh and resume every step.
- Prevent skipping required inputs.
- Complete all five lab checkpoints.
- Verify aggregate prediction results update correctly.
- Verify group-based extraction success is not inflated by multiple students in one group.
- Complete and restart a second lab from the same device.
- Confirm the badge fits without text overlap on small phones.
- Confirm photo selection never creates a remote upload.

### Organizer dashboard

- Reject incorrect organizer PINs.
- Display correct student, group, completion, and understanding totals.
- Display observation tags and prediction distributions.
- Export valid CSV and JSON.
- Copy the correct QR/join URL.
- Handle an empty class and an inactive class clearly.

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
- every class uses a unique code and private PIN;
- student progress survives a refresh;
- public endpoints cannot expose individual answers;
- organizer totals match test submissions;
- the completion page works on mobile;
- the school has approved whether names may be collected and the teacher understands the privacy and deletion process;
- identity records are separated from learning responses and names never leave the secured application in AI requests;
- AI follow-up signals are advisory, evidence-linked, teacher-reviewed, and never used to make an automatic decision;
- the student Lab Coach is grounded in approved DNA content and can be disabled per session;
- the workshop works without AI; and
- a presenter has completed a full rehearsal using the actual QR code.

## Cost approach

- GitHub Pages hosting: free.
- Supabase: begin on the free plan and monitor storage and usage.
- Core SCOPE analytics: free, because calculations run in the application/database.
- Optional AI summary: use one short request per class and begin with a small prepaid balance.
- Student photos: no remote storage in the MVP.

## Future possibilities

Only after the DNA Lab has been successfully piloted:

- additional SCOPE workshops;
- reusable organizer session creation tools;
- authenticated chapter-member accounts;
- teacher-facing PDF impact reports;
- curriculum-aligned question banks;
- bilingual content; and
- consented private photo storage with automatic deletion.
