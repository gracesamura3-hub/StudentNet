# StudentNet Hackathon Presentation Deck

## How to use this deck

This is a 16-slide presentation outline for a judging panel. Each slide includes the message to place on screen and a short presenter note. Keep the visual slide concise; use the notes to explain the engineering decisions and demonstrate the working product.

## Slide 1: Title and team overview

**On screen**

# StudentNet

A trusted career community for students, alumni, employers, and staff.

- Team: `[insert team names]`
- Platform: Expo React Native + Firebase
- Scenario: Richfield and AAA career community

**Presenter notes**

Open with the problem in one sentence: talented students have portfolios, alumni knowledge, and employer opportunities, but these resources are disconnected. StudentNet brings them into one trusted workflow. Name each team member and assign the live demo roles before presenting.

## Slide 2: Scenario response and problem statement

**On screen**

Students need more than a job board:

- A credible professional identity
- Access to mentors and alumni pathways
- Opportunities matched to skills and programme
- Feedback, visibility, and measurable progress

**Presenter notes**

Explain that the product responds to a community scenario rather than solving only recruitment. The platform connects identity, relationships, learning, opportunity discovery, and institutional trust in one experience.

## Slide 3: Four user types and role breakdown

**On screen**

| Role | Value delivered |
| --- | --- |
| Student | Portfolio, network, pathways, applications, analytics |
| Alumni | Mentoring, career stories, endorsements, recommendations |
| Employer | Opportunities, applicants, skill demand, pipeline |
| Administrator | Verification, moderation, announcements, governance |

**Presenter notes**

Show the demo persona switcher for student, alumni, and business views. Explain that the Admin role is not a public persona in production: it is provisioned out of band. The same backend rules enforce these distinctions even if someone bypasses the UI.

## Slide 4: Authentication architecture and alumni verification

**On screen**

- Firebase Email/Password authentication
- Student institutional-email verification
- Alumni personal-email registration plus graduation reference
- Business registration reference plus staff approval
- Admin provisioning outside the app

**Presenter notes**

Defend the alumni decision: graduates may no longer have an active student mailbox, so mailbox-only verification is exclusionary. StudentNet accepts a personal email but requires an institutional reference and manual review. The profile remains `pending` until approved. This preserves access without removing trust.

## Slide 5: System architecture and technology choices

**On screen**

```text
Expo React Native
  ├── Firebase Auth
  ├── Cloud Firestore
  ├── Firebase Storage
  ├── Cloud Functions / Cloud Run
  └── AI HTTPS endpoint
```

**Technology decisions**

- React Native: shared native and web UI with one JavaScript codebase
- Expo: rapid cross-platform delivery and device APIs
- Firestore: real-time feeds, chat, notifications, and flexible profile documents
- SQL remains appropriate for reporting, but Firestore fits evolving mobile aggregates and listener-driven UX

**Presenter notes**

React Native was selected because the product needs Android, iOS, and web reach with a shared component system. Flutter would also be viable, but the team’s JavaScript/Expo ecosystem and existing Firebase integration reduce delivery risk. Firestore gives realtime listeners and document-oriented subcollections for profiles, recommendations, applications, messages, and notifications. A warehouse or SQL reporting layer can be added later for historical analytics.

## Slide 6: Admin operations and out-of-band security

**On screen**

- No public administrator signup
- `scripts/provision-admin.mjs`
- Firebase custom claim: `admin: true`
- Active Firestore profile: `role: 'admin'`
- Rules enforce both claim and profile state

**Presenter notes**

Show the provisioning command in the README, not a real credential. Explain that frontend gating is not security. Firestore evaluates `request.auth.token.admin == true` and the active profile role before allowing administrator reads or writes. This protects approvals, moderation, events, announcements, and analytics even if a client is modified.

## Slide 7: Digital portfolio and profile system

**On screen**

A profile can include:

- Headline, programme, campus, and completion
- Skills and endorsements
- Projects, experience, achievements, and links
- Visibility preview for public and connections audiences
- AI profile coach

**Presenter notes**

Open the Profile tab. Show the profile completion card, portfolio sections, visibility switch, and profile assistant. Emphasise that the profile is a living portfolio rather than a static CV. Visibility is a product control and a Firestore authorization concern.

## Slide 8: Endorsements and recommendations engine

**On screen**

```text
users/{userId}/endorsements/{skillId}
users/{userId}/recommendations/{recommendationId}
```

- Transactional endorsement toggle
- Duplicate prevention by authenticated user ID
- Recommendations submitted as `pending`
- Approved recommendations shown publicly
- Accepted-connection requirement

**Presenter notes**

Demonstrate endorsing a skill and explain that the transaction updates the `endorsedBy` list and count atomically. Demonstrate the recommendation form from another profile. The client checks the connection, but Firestore rules also require an accepted connection, so the security decision is server-enforced.

## Slide 9: Social feed, career stories, and video processing

**On screen**

- Live personalized feed
- Career stories and institutional events
- Reactions and professional updates
- Video duration and size validation
- Native or web thumbnail generation
- Storage-backed `videoUrl` and `thumbnailUrl`

**Presenter notes**

Open Home and show the feed and composer. Explain that the current client validates videos up to 60 seconds and 50 MB and creates a poster thumbnail using native Expo APIs or browser canvas. Storage rules constrain owner uploads. For production-scale transcoding, the roadmap uses Cloud Functions or Cloud Run with FFmpeg.

## Slide 10: Smart job matching engine

**On screen**

```text
Match score =
  60% skill overlap
+ 25% programme alignment
+ 15% career-interest alignment
```

Returns:

- Score from 0 to 100
- Matched skills
- Human-readable reasoning

**Presenter notes**

Open Careers and select Best matches. Explain that the engine is deterministic, explainable, and safe for missing data. It handles both existing `skills` fields and richer `requiredSkills`, `targetProgrammes`, and interest fields. The UI shows a match badge and reasoning rather than an unexplained score.

## Slide 11: AI profile assistant and NLP skill extractor

**On screen**

- Profile coach for headline, skills, and project guidance
- Rule-based extraction baseline
- Recognizes technical skills and qualifications
- Candidate pills are selectable before saving
- Optional server AI endpoint for richer guidance

**Presenter notes**

Open Profile and select “Extract skills from bio or CV.” Paste a short paragraph, scan it, toggle suggestions, and save the selected skills. Explain that the local extractor is deterministic and privacy-friendly. An optional authenticated HTTPS endpoint can provide richer coaching; provider secrets never enter the Expo client.

## Slide 12: Student visual analytics dashboard

**On screen**

- Profile completeness ring
- Comparison with programme peers
- Profile view and engagement trend bars
- Employer-searched skill distribution
- Connections and engagement metrics

**Presenter notes**

Open Insights as a student. Point out that every important number is paired with a visual. The ring communicates progress at a glance, bars show trend shape, and horizontal bars show the skills that need attention. Explain that historical analytics will become more accurate as aggregate snapshots are maintained by backend jobs.

## Slide 13: Employer visual analytics dashboard

**On screen**

- Applicant pipeline per opportunity
- Candidate skill demand bars
- Applicant programme distribution
- Applicant year distribution
- Role and applicant totals

**Presenter notes**

Switch to the business preview or sign in as an approved employer. Explain that the dashboard is action-oriented: it helps an employer understand which listings attract candidates and what skills appear across the applicant pool. Programme and year distributions are derived from application profile fields where available.

## Slide 14: Administrator visual analytics dashboard

**On screen**

- Registered users by role
- Platform activity bars
- Posts versus short videos
- Approved opportunity volume
- Flagged moderation indicators
- Review queue

**Presenter notes**

Show Insights as an admin, then open the Admin tab. Connect the visuals to operational decisions: where membership is growing, whether content is healthy, how many opportunities are live, and what requires moderation. Explain that admin analytics are protected by both role profile and custom claim.

## Slide 15: Data privacy and POPIA strategy

**On screen**

- Purpose limitation
- Data minimisation
- Explicit consent and permission prompts
- Granular profile visibility
- Owner-only CV access
- Participant-only messages
- Retention, correction, export, deletion roadmap
- Server-side AI and verification secrets

**Presenter notes**

Do not claim that a prototype alone equals legal compliance. Explain the controls already designed into the system and the institutional responsibilities still required: an information officer, formal impact assessment, consent notices, retention schedule, data-subject workflows, and breach response. Alumni references should be restricted and deleted or redacted after verification according to policy.

## Slide 16: Future roadmap and live demo checklist

**On screen**

**Roadmap**

- Historical analytics snapshots
- Cloud video transcoding and moderation
- FCM/APNs notification delivery
- Firebase App Check and rate limits
- Advanced matching and trusted AI endpoint
- POPIA export/deletion workflows

**Live demo sequence**

1. Student onboarding and profile
2. Skill extraction and endorsement
3. Network and career pathways
4. Best-match opportunity
5. Employer analytics
6. Admin approval and moderation
7. Notification banner and sign-out

**Presenter notes**

Close by showing that the roadmap follows the same architecture: trusted backend jobs for heavy processing, explainable client behavior, and stronger governance before production. Keep a demo account, a demo admin account, seeded opportunities, and a known notification ready. Never display real passwords, service-account JSON, Firebase private keys, or personal verification references.

## Presenter readiness checklist

### Before the presentation

- Confirm `.env` exists locally but is not on screen or in the repository.
- Run `npm install` and `npx expo start --clear`.
- Confirm Firebase Authentication Email/Password is enabled.
- Confirm Firestore rules, indexes, and Storage rules are deployed.
- Confirm an approved student, alumni, employer, and provisioned admin account or demo persona.
- Confirm at least one approved opportunity and one pending moderation item.
- Confirm a notification document exists for the live banner demonstration.
- Confirm the optional AI endpoint is either working or that the offline assistant response is clearly labelled.

### During the presentation

- Explain the trust boundary before showing admin controls.
- Use demo data for speed, then show the relevant Firestore structure or rules as evidence.
- Keep the live flow focused on decisions the product enables, not on code navigation.
- When asked about security, distinguish UI affordances from Firestore enforcement.
- When asked about POPIA, distinguish implemented controls from the formal institutional compliance work still required.

### Commands referenced in the demo

```bash
npm install
npx expo start --clear
npm run preview
npm run lint
npx expo export --platform web
firebase deploy --only firestore:rules,firestore:indexes,storage
```
