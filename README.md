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

1. Create a Firebase project and register a **Web** application. In **Project settings > Your apps > SDK setup and configuration**, select **Config** and copy its values; do not use a service-account JSON file in the Expo app.
2. In **Authentication > Sign-in method**, enable **Email/Password**. Add the deployed web hostname to **Authentication > Settings > Authorized domains** when testing outside localhost.
3. Create a Cloud Firestore database in Native mode. Create a Firebase Storage bucket when portfolio uploads are needed.
4. Copy `.env.example` to `.env` and fill each variable with the matching web config value. Authentication needs `apiKey`, `authDomain`, `projectId`, and `appId`; Storage and Messaging values do not block sign-in.
5. Install the Firebase CLI, select the same project ID, and deploy the repository security configuration:

```bash
firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Restart Expo after changing `.env` so the `EXPO_PUBLIC_` values are rebuilt into the client:

```bash
npx expo start --clear
```

### Richfield sign-in checklist

A Richfield mailbox is not automatically a StudentNet account. A working student account has all three of the following:

1. An Email/Password user in **Firebase Authentication > Users**.
2. A matching `users/{firebaseUid}` Firestore document created by StudentNet registration.
3. A verified address ending in `@my.richfield.ac.za`, `@richfield.ac.za`, `@my.aaa.ac.za`, or `@aaa.ac.za`.

Use **Create your profile** in the app to create both the Authentication user and Firestore profile, then open the verification email before signing in. Do not create a student only in the Firebase Authentication console: it will have no StudentNet profile and sign-in will be rejected. Provision staff administrators with the script below; alumni and business profiles remain pending until an administrator approves them.

The sign-in screen now includes **Forgot password?** for Firebase accounts. If sign-in still fails:

- **Authentication: configuration required** means `.env` is absent or is missing a required value.
- **Email or password is incorrect** means the account is not in this Firebase project or the password does not match; use password reset.
- **Verify your institutional email** means the Firebase email verification link has not been completed.
- **Account profile is missing** means the Auth user has no matching `users/{uid}` document; register through StudentNet or have an administrator repair the profile.
- **Firebase denied access** means the repository Firestore rules were not deployed to the same project configured in `.env`.

For a no-cloud development account, run `npm run preview`, choose **Create your profile**, and then sign in on that same browser/device. These local accounts do not exist in Firebase and do not carry across browsers or devices.

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

## Role model and access decisions

StudentNet has four distinct user roles. The role is stored in the `users/{uid}` profile and is enforced again by Firestore rules; the client never treats a hidden button as a security boundary.

| Role | Primary capabilities | Verification and access rule |
| --- | --- | --- |
| Student | Build a portfolio, connect with the community, explore pathways, apply for roles, message connections, and view personal analytics | Registration requires an institutional email. The account is activated only after Firebase email verification and the matching profile is valid. |
| Alumni | Maintain a professional profile, mentor students, share career stories, endorse skills, write recommendations, and contribute pathway outcomes | Personal email is accepted, but the applicant supplies a student number, graduation reference, or other institutional proof. Staff approve the profile before active access. |
| Business/employer | Publish opportunities, review applicants, identify skills, and manage a recruitment pipeline | Registration requires a company website or registration reference. Staff approval is required before employer operations become active. |
| Administrator | Approve members and opportunities, moderate content, publish events and announcements, and inspect platform analytics | No public signup. An authorised operator provisions the account out of band and assigns the Firebase `admin: true` custom claim. |

The application has three runtime experiences: Firebase-backed production authentication, explicitly enabled device-only local development authentication, and a no-credentials demo preview. Demo personas are useful for a presentation, but they do not grant Firebase data access and cannot enter the Admin tab.

## Alumni identity verification strategy

Alumni often lose access to their student mailbox after graduation, so requiring an active `@my.richfield.ac.za` address would exclude legitimate graduates. StudentNet uses a staged trust model:

1. The applicant registers with a reachable personal email and supplies a student number, graduation reference, programme, or other agreed institutional reference.
2. The client validates that the reference is present, then creates a Firebase account and a `users/{uid}` profile with `role: 'alumni'`, `status: 'pending'`, and `verified: false`.
3. An administrator compares the submitted reference against institutional records or an approved alumni register. The reviewer may approve, reject, or request clarification.
4. Only an approved profile with `status: 'active'` can access protected community data. Firestore rules enforce the active-state requirement independently of the UI.

This balances accessibility and trust: graduates are not blocked by an expired mailbox, while the platform still requires evidence that a person belongs to the alumni community. The reference is used for verification, not displayed as public profile content. In production, the reference should be encrypted or access-restricted, retained only for the verification period, and deleted or redacted under the institution's retention policy.

## Admin provisioning and security rationale

Administrators are provisioned by `scripts/provision-admin.mjs`, never through public registration. The operator authenticates to Firebase Admin SDK with Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS`, supplies `FIREBASE_PROJECT_ID` and `ADMIN_EMAIL`, and supplies a strong `ADMIN_PASSWORD` only when a new Firebase Auth account must be created.

The script:

- Finds or creates the Firebase Auth account.
- Sets the custom claim `{ admin: true }`.
- Creates or repairs an active `users/{uid}` profile with `role: 'admin'`.
- Leaves the account ready for normal staff sign-in.

The critical security decision is that frontend gating is only a usability feature. The Firestore rule helper `admin()` requires both an active profile with `role == 'admin'` and `request.auth.token.admin == true`. This prevents a user from gaining administrator authority by editing local state, changing a route, or submitting a forged profile field. Admin-only writes include user decisions, opportunity approvals, event publication, announcements, moderation actions, and analytics reads.

After changing a custom claim, the user must refresh their Firebase ID token by signing out and back in, or otherwise forcing token refresh. Service-account credentials and admin passwords must remain outside the Expo bundle and must never be placed in `.env` public variables.

## Feature implementation map

The hackathon implementation is organized into five steps:

- **Step 1:** Persistent onboarding, interactive tutorial, skill endorsements, written recommendations, and the career pathway explorer.
- **Step 2:** Weighted smart job matching and the rule-based NLP skill/qualification extractor.
- **Step 3:** Client-side video validation and thumbnails, Storage-backed media posts, push-token registration, real-time notification listeners, and the in-app notification banner.
- **Step 4:** Reusable `BarChart`, `ProgressRing`, and `HorizontalMetricBar` components powering student, employer, and administrator dashboards.
- **Step 5:** This documentation, the alumni verification strategy, the admin security rationale, and the presentation deck in `docs/PRESENTATION_DECK.md`.

The chart layer is intentionally small and cross-platform. It uses `react-native-svg` for radial rings and flex-based React Native views for bars, so the same visual components work on native and Expo Web. Firebase remains the source of live analytics data; where historical analytics are not yet stored, the UI clearly presents the available aggregate rather than claiming a nonexistent time series.

## POPIA presentation position

StudentNet's POPIA position is based on purpose limitation, data minimisation, consent, access control, and accountable deletion:

- Registration explains why identity, programme, skills, and verification references are collected.
- Profile visibility is granular: users can preview public versus connections visibility, and business visibility is constrained by profile fields.
- CVs and private messages are not public feed content. Storage rules and Firestore rules enforce ownership and participant access.
- Alumni verification references are restricted to authorised reviewers and should have a documented retention period.
- Push notifications are opt-in at device permission level; a denied permission does not prevent core app use.
- Users should receive correction, export, and deletion workflows before production launch.
- Analytics should be aggregated for platform reporting instead of exposing raw personal profiles.
- AI requests should send only the minimum profile context needed, with provider secrets kept server-side.

These controls are part of the product design, not a promise that a prototype is already a complete legal compliance programme. Before production, the institution should complete a formal POPIA impact assessment, appoint an accountable information officer, approve retention schedules, and publish consent and privacy notices.
