# Mostanad Academy

Responsive Arabic/English website for Mostanad Academy. This lightweight upload copy keeps the website, learning portal, course text, and Supabase functions while omitting unlinked document collections, archives, and unused images.

## Preview

Open `index.html` directly, or use the VS Code Live Server extension to preview the full site. No build step or package installation is required.

The landing page and learning portal support Arabic and English. The shared theme button keeps the light/dark preference across the landing page, portal, privacy policy, and resource pages using the browser's local storage.

The homepage and learning portal include FAQs, and the course previews outline prerequisites and learning outcomes. Current prices are informational only; online payments and external analytics are not enabled. The site includes a bilingual operational draft of the terms of use; the academy owner should review the legal and privacy text against the actual deployment and local requirements before launch.

## Pages

- `index.html` — bilingual academy landing page and navigation to the main resources.
- `academy_index.html` — the Supabase-backed learning portal, including invited sign-in, student learning, instructor authoring, and protected admin workflows.
- `courses.html`, `course-detail.html`, `login.html`, `register.html`, `dashboard.html`, `course-player.html`, `quiz.html`, `certificates.html`, `profile.html`, `instructor-dashboard.html`, and `admin-dashboard.html` — learning-platform page views.
- `platform-pages.js` — local, browser-only previews for those page views; it is not an authentication or authorization layer.
- `admin.html` — legacy route that redirects to the Supabase portal; use its protected admin dashboard instead of the old browser-only panel.
- `404.html` — branded fallback page for invalid URLs.
- `privacy-policy.html` — privacy information.
- `terms-of-use.html` — bilingual draft terms of use; requires owner review before public launch.
- `shared-site.css` and `shared-site.js` — shared navigation, footer, responsive layout, and theme support for resource pages.

The original PDF, Word, Excel, and archive materials are intentionally not included in this lightweight copy. The course descriptions and upload controls remain; instructors can add course files and videos after configuring the external storage integrations below.

The site uses the shared `mostanad-academy-theme` preference across the homepage, academy portal, document library, social pages, and privacy page. New visitors start in dark mode; the header's theme control changes the preference for all site pages.

## Learning portal

The Supabase-backed portal is `academy_index.html`; its authentication, enrollment, progress, quiz grading, certificates, and instructor/admin actions depend on the configured database and protected Edge Functions described below. Public account creation is disabled. The initial administrator is bootstrapped by the academy owner; administrators can invite student/instructor accounts, manage roles and access, publish courses, and manage enrollments. Instructors and administrators can create courses and lessons and manage course resources. Course prices are informational only; online payments are not connected.

The portal includes Google OAuth sign-in and a general learning assistant in the authenticated dashboard, in addition to the course-lesson tutor. Both require the Supabase project to be configured; the assistant also requires the `GEMINI_API_KEY` server secret and the deployed `tutor` Edge Function. Assistant conversations are saved to the academy database and sent to Gemini for responses; do not submit passwords or confidential project information. The assistant does not search private course files or live website data.

The separate page views linked from the main site are local previews. Their demo accounts, profile details, notes, comments, course drafts, and progress are stored in browser `localStorage`, can be changed by the user, and must not be used for private or production data. They do not verify email, authenticate passwords, enforce role access, stream protected videos, or issue verifiable certificates. Use the Supabase portal for server-backed account and content features after configuring it.

### 1. Create and configure Supabase

1. Create a Supabase project. In **Project Settings → API**, copy the **Project URL** and **publishable/anon key** into the matching fields in the root `config.js`. The publishable/anon key is designed for browser use; never put a service-role/secret key, Google client secret, or Gemini key in `config.js` or any other browser file. Save and deploy the updated `config.js` with the site.
2. Apply all database migrations (including the administrator content-access policies) and deploy the protected Edge Functions:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase functions deploy tutor
   supabase functions deploy quiz-admin
   supabase functions deploy quiz-submit
   supabase functions deploy certificate-issue
   supabase functions deploy admin-users
   supabase functions deploy admin-invite
   ```

3. Configure `INITIAL_ADMIN_EMAIL` and `ACADEMY_REDIRECT_URL` in **Supabase → Edge Functions → Secrets**. Use the academy owner's exact email and the exact local or deployed HTTPS academy URL. For local preview, also add that local URL to Supabase Auth's allowed redirect URLs; production must use the deployed URL.

4. Approve the initial administrator email before creating the first Auth account. Run this in the Supabase SQL editor, substituting the same owner email:

   ```sql
   insert into public.academy_invites (email, role, status)
   values (lower(trim('YOUR_ADMIN_EMAIL')), 'student', 'approved')
   on conflict (lower(email)) do update
     set role = 'student', status = 'approved', user_id = null, accepted_at = null;
   ```

   Then invite that email from the Supabase Auth dashboard, confirm the email, sign in, and redeem the one-time administrator code. Public sign-up remains disabled; all later student or instructor accounts are approved and invited from the administrator dashboard. Email invitations require Supabase Auth email delivery to be configured and tested.

5. Generate the one-time administrator invite locally. The command displays the code in your terminal; add it as `ADMIN_INVITE_CODE` in **Supabase → Edge Functions → Secrets**. Share it directly with the intended account holder only. Do not copy it to source files, screenshots, or chat. Set `GEMINI_API_KEY` in the same server-side Secrets screen; it must never go in `config.js`:

   ```powershell
   $adminInvite = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
   supabase secrets set "ADMIN_INVITE_CODE=$adminInvite"
   Write-Output "One-time administrator invite: $adminInvite"
   Remove-Variable adminInvite
   ```

6. In **Supabase → Authentication → URL Configuration**, set the Site URL to the deployed site origin and add the exact deployed `.../academy_index.html` URL to the allowed redirect URLs. For the current GitHub Pages site, this is `https://ahmedkhalaf477.github.io/Mostanad-Academy/academy_index.html`. Add your local preview URL only while testing.
7. In **Supabase → Authentication → Providers**, enable email and Google sign-in, turn off public user sign-ups, and configure Google. In Google Cloud Console, create a Web OAuth client; copy the callback URI shown by Supabase's Google provider settings into the Google client's **Authorized redirect URIs** (it is typically `https://<project-ref>.supabase.co/auth/v1/callback`). Add the production site origin to the Google client's **Authorized JavaScript origins**, then enter the Google client ID and client secret only in Supabase's Google provider settings. Add the OAuth scopes needed by Drive and Calendar there, and add the Google test account while the consent screen is in testing.

   Once configured, the administrator dashboard can invite approved student/instructor emails, change student/instructor roles, suspend or restore sign-in, publish courses, and manage lessons/resources. The initial administrator code can promote only the configured, email-confirmed owner account and can be redeemed once. To add or remove other administrators, use the owner-only SQL process below:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where lower(email) = lower('owner@example.com'));
   ```

   Promote additional trusted instructors by changing `admin` to `instructor` in the same owner-only query. Role assignment is otherwise unavailable in the website.

The migrations create private course-resource and assignment-submission buckets, row-level access policies, protected quiz answer keys, and an hourly tutor quota. Administrators can manage courses, course files, enrollments, assignments, and live sessions; role updates are limited to student/instructor accounts, while promoting or demoting an administrator remains an owner-only SQL operation. Course duration, display price, and schedule are optional Arabic/English fields set when a course is created. Price text is informational only; checkout is not connected. Course resources are limited to 50 MB; student assignment submissions use private, expiring download links. Videos are uploaded to the signed-in instructor's Google Drive in resumable chunks (up to 500 MB), and remain private unless the instructor explicitly selects the option to share them with current enrollees.

Each lesson must have a configured quiz to qualify for a course-completion certificate. Lesson progress is recorded by the server only after a student passes that lesson's quiz; students cannot write completion records directly. Apply the database migrations with `supabase db push`, then deploy the updated `quiz-submit` and `certificate-issue` functions.

### 2. Configure Google

- In Google Cloud Console, enable Google Drive API and Google Calendar API, configure the OAuth consent screen, and create an OAuth client for the deployed website.
- Add the OAuth client ID/secret to the Google provider in Supabase Auth. Configure the required OAuth consent/scopes for `drive.file` and `calendar.events`; the owner may need to verify the consent screen or add test accounts while the app is in testing.
- Add the exact academy website origin and Supabase Auth callback URL to the Google OAuth client's allowed origins and redirect URIs.
- Google sign-in is required for Drive uploads and Meet scheduling. Drive videos are private by default. Sharing grants read access only to the currently enrolled students' Google email addresses; newly enrolled students must be shared explicitly later in Google Drive. Calendar events are created in the instructor's primary calendar.
- An optional private Drive folder ID can be entered in `config.js` as `googleDriveFolderId`.

### 3. Publish and test

Publish the repository root as a static site (for example, GitHub Pages), preserving the `supabase`, `HTML`, `DC posts`, `IMG`, and `PDF` directories and their exact capitalization. Configure the same published `/academy_index.html` URL in Supabase Auth. Test admin-created student and instructor accounts, email confirmation, sign-in, student enrollment, course access, submissions, instructor publishing, Google permissions, and Edge Functions with separate test accounts before inviting learners.

Payments are not connected. Email delivery, Google OAuth consent, Gemini usage/cost limits, and any production privacy/retention requirements must be configured and reviewed by the academy owner before public launch. Do not paste credentials into source control or chat.

Before public launch, have the academy owner review the privacy policy, operational terms draft, contact channels, course outcomes, testimonials, and any displayed prices/schedules. Exercise the full student and instructor workflows with test accounts, verify role and private-file access, check the deployed site on phone and desktop, and confirm that all internal document links work. The portal remains unavailable for account actions until valid Supabase settings, migrations, and required server-side functions are configured.

## GitHub

To store this project on GitHub, create a repository and upload the contents of this folder so `index.html`, `academy_index.html`, `.github`, and `supabase` are at its root. GitHub Desktop is an easy way to publish the folder; do not upload secrets or service-role keys.

The included `.github/workflows/deploy-pages.yml` can publish a static preview with GitHub Pages when the repository and use case meet GitHub Pages' terms. GitHub Pages is not suitable for a commercial course platform or SaaS; select a production host that supports the intended service and connect the configured Supabase backend separately.

**Important:** a private source repository does not automatically make a GitHub Pages site private. On standard GitHub plans, Pages content is publicly accessible; private Pages access control requires GitHub Enterprise Cloud. Review the site content before publishing it publicly.

Publishing the static files does not create/configure the Supabase backend. Configure Supabase, Google OAuth, and the Gemini server secret separately using the steps above. GitHub Pages cannot host the Supabase database or Edge Functions.
