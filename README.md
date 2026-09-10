# StudentNet

StudentNet is a professional networking mobile app for Richfield and AAA students, alumni, employers, and staff. It turns a student profile into a living portfolio, connects the institution’s community, and surfaces career opportunities that match a learner’s programme and skills.

The app is built with React Native and JavaScript using Expo. Firebase Authentication provides real accounts, Cloud Firestore is the NoSQL database, Firebase Storage holds portfolio media, and Firestore listeners provide real-time product updates.

## What is included

- Secure entry flows for students, alumni, and businesses; administrators cannot self-register.
- Institutional email enforcement for `@my.richfield.ac.za`, `@richfield.ac.za`, `@my.aaa.ac.za`, and `@aaa.ac.za` students.
- Verification queues for alumni and business users, with backend-enforced role access in `firestore.rules`.
- Guided three-step onboarding and an endpoint-backed AI profile coach.
- Professional portfolio profiles with skills, endorsements, projects, experience, achievements, links, and visibility controls.
- A personalised social feed, career stories, reactions, posting, connections, mentor discovery, and direct messaging.
- Approved opportunities with skill matching, saving, and in-app applications.
- Career-path discovery based on alumni outcomes.
- Separate student, business, and administrator analytics experiences with visual charts.
- Administrator review queues and role-specific platform summaries.
- A no-credentials interactive preview for demonstrations. Preview personas are not authentication substitutes.

## Run locally

Requirements: Node.js 20 or newer, npm, and the Expo Go app or an Android/iOS emulator.

```bash
npm install
cp .env.example .env
npm start
```

Press `a` for Android, `i` for iOS on macOS, or `w` for the browser preview. The app can always be explored through **Explore the interactive preview**. Adding Firebase variables activates shared Firebase Authentication and Firestore accounts.

For explicit device-only authentication during local development, run `npm run preview`. This sets `EXPO_PUBLIC_ENABLE_LOCAL_AUTH=true` for that development process only. Local passwords use a versioned PBKDF2-SHA256 record, but the accounts are intentionally device-only and must never be treated as production identities. Production builds ignore this flag.

Useful checks:

```bash
npm run lint
npx expo-doctor
npx expo export --platform web
```

## Firebase setup

1. Create a Firebase project and register a web application.
2. Enable Email/Password in Firebase Authentication.
3. Create a Cloud Firestore database and a Firebase Storage bucket.
4. Copy the web configuration values into `.env` using `.env.example` as the template.
5. Install the Firebase CLI, select the project, and deploy the security configuration:

```bash
firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes,storage
```

For a production build, remove or feature-flag the preview entry points in `src/screens/AuthScreen.js`. Do not place Firebase service-account credentials or AI-provider secrets in Expo environment variables; those belong in Cloud Functions/Secret Manager.

### Authentication decisions

- **Students:** a Firebase email/password account plus an institutional-domain check in both the client and Firestore rules. The profile remains pending until the institutional email is verified.
- **Alumni:** personal email plus a student/graduation reference. The account remains pending until staff compare the reference with institutional records.
- **Businesses:** email plus a company website or registration number. Staff approve the company before protected access is granted.
- **Administrators:** provisioned out of band by authorised Firebase administrators with an `admin: true` custom claim and an active `admin` profile document. There is no client registration route.

Firestore rules are the source of truth for authorisation. UI variations improve usability but never grant data access.

### Provision an administrator

Administrator signup is deliberately not exposed in the mobile app. With Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` configured for an authorised Firebase service account, run:

```bash
read -rsp 'Temporary administrator password: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
FIREBASE_PROJECT_ID=your-project-id ADMIN_EMAIL=staff@richfield.ac.za npm run admin:provision
unset ADMIN_PASSWORD
```

For an existing Firebase Authentication user, `ADMIN_PASSWORD` is unnecessary. The command sets the protected `admin` custom claim and creates or repairs the corresponding active administrator profile. The user may then sign in through the normal staff sign-in form.

## Data model

Firestore uses documents because profiles, content, messages, and live notifications evolve independently and are read frequently in mobile feeds.

| Collection | Purpose |
| --- | --- |
| `users` | Role, verification state, professional portfolio, visibility and push tokens |
| `posts/{post}/comments` | Professional updates, video metadata, reactions and discussion |
| `connections` | Pending and accepted professional relationships |
| `conversations/{conversation}/messages` | Private real-time messaging |
| `opportunities/{opportunity}/applications` | Moderated jobs and candidate pipelines |
| `events` | Administrator-published institutional events |
| `announcements` | Role-targeted platform notices |
| `users/{user}/notifications` | Real-time in-app alerts and matching results |

`firestore.indexes.json` contains the compound indexes used by the live feed and opportunity queries. `storage.rules` isolates CVs while allowing authenticated portfolio media access.

## Architecture

```text
Expo React Native app
  ├── Firebase Authentication ── verified identity and session
  ├── Cloud Firestore ────────── profiles, feed, jobs, chat, analytics
  ├── Firebase Storage ───────── CVs, portfolios, processed video
  ├── Cloud Functions ────────── claims, matching, moderation, FCM
  └── AI HTTPS endpoint ──────── contextual profile feedback / CV NLP
```

The mobile UI reads live Firestore snapshots for the feed and approved opportunities. Writes go through narrow service functions in `src/firebase/`. Approval, aggregation, job matching, notification delivery, NLP, and video transcoding should run in trusted Cloud Functions or Cloud Run rather than on a phone.

## AI profile coach

Set `EXPO_PUBLIC_PROFILE_ASSISTANT_URL` to an authenticated HTTPS Cloud Function that accepts:

```json
{ "message": "Strengthen my headline", "profile": { "headline": "...", "skills": ["..."] } }
```

and returns `{ "answer": "..." }`. The server should use a recognised model/framework, redact unnecessary personal data, apply safety filters, and never expose its provider key to the app. The preview provides a clearly labelled offline response when this endpoint is absent.

## Production checklist

- Enable Firebase App Check and rate limits.
- Create the staff-only admin account and set its custom claim using the Firebase Admin SDK.
- Implement Cloud Functions for matching, push delivery, moderation aggregates, and approvals.
- Process videos in a trusted service with FFmpeg (transcoding, compression, and thumbnail generation) before publishing their Storage URL.
- Extract CV text on the server and pass only required content through the approved NLP provider.
- Register device tokens and use FCM/APNs for live notifications; do not add polling.
- Export analytics into privacy-preserving aggregate documents rather than exposing raw profiles.
- Complete a POPIA impact assessment, retention schedule, consent copy, account export, and deletion workflow.

## Privacy

StudentNet follows data minimisation: CVs are owner-only, business access is constrained by profile visibility, users can preview their profile audience, and administrators receive only the elevated access required for moderation. Production policies must document purpose, consent, retention, correction, export, and deletion in line with POPIA.
