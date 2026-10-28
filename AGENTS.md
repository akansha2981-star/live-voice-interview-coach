<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Public demos use labelled sample metrics; recorded previews use the video's media clock and verified captions so buffering cannot advance transcript counts. Absent faces have unavailable visual metrics. College logos retain artwork without affiliation claims. Checkout grants verified payments atomically; locked triggers reserve SOP allowances and resume reviews allow one concurrent run.
- Public course offers and comparison share the anonymous live-only catalog; keep sample metrics and review placeholders labelled, motion reduced-motion-aware, and checkout behind existing student sign-in to preserve private data and payment logic.
- Document analysis uses schema-validated provisional sections from the same model stream persisted under owner-only reads; timers may poll progress but never invent stage completion, and only exact source quotes qualify as evidence.
- College limits are snapshotted on atomic interview creation; relay and UI use the absolute deadline across reconnects, while live question-count guidance must never be represented as exact playback enforcement without a supported audio gate.
- Finance usage is a server-written idempotent ledger attributed to product and transaction; estimates retain effective-rate snapshots, invoice reconciliation excludes covered estimates, and finance writes use audited staff-only database functions so costs never depend on client assertions.
- Student and admin presentation share student surface tokens, StudentPageHeading and grouped navigation; keep visual redesigns independent of payment, booking and assessment logic, and preserve the existing staff access gate and management queries.
- Detailed reports render through a browser-safe report workspace and evidence helpers shared with PDF export; transcript timestamps are turn-level and camera timelines stay aggregated, never inferred frame-level events.
- All AI (text in `src/lib/ai.server.ts`, live voice via OpenAI Realtime WebRTC calls + sideband control socket) uses the owner's `OPENAI_API_KEY` directly so usage bills to their OpenAI account, not Lovable credits.
- Live voice interviews go through `src/lib/live-relay.server.ts` (dispatched at `/api/live` in `src/server.ts`, dev via `live-vite-plugin.ts`); the relay verifies the Supabase token + interview ownership in `interview-session.server.ts` before opening a paid session.
- Interview credits are a ledger (`credit_ledger`); spending happens only in the `start_interview()` SQL function so it stays atomic.
- `interviews` is read-only to clients; all writes (transcript, report) go through server functions in `src/lib/interview.functions.ts` using the admin client after an ownership check.
- Camera (`src/lib/vision.ts`) and microphone analysis run only in the browser, reusing the existing voice stream and cleaning up with the call; only aggregated metrics are stored, never video or recordings.
- Report schema and rubric calculations are browser-safe pure modules; deterministic weighted ability scoring excludes camera-derived coaching.
- Slot availability and booking use database functions with row locks; equipment checks are recorded through authenticated server functions before the atomic start_interview credit spend.
- Fetch slot availability in ordered pages so dense schedules are not truncated by the Data API row limit.
- Dashboard transcript detail is fetched on demand; interview history reads lightweight summary metrics rather than every transcript.
- The interview route uses a full-viewport accessible dialog while keeping the existing voice hook and transport lifecycle unchanged.
- Live interview is a viewport-bounded workspace: conversation grid plus compact persistent tracking band, alert settings in a dialog, and transcript following that scrolls only its own container so caption updates never move the room.
- Defer/deduplicate auth redirects until session locks release; dashboard exceptions use service-written `prelaunch_dashboard_access`, not staff roles.
- Dashboard insights are computed by the browser-safe `src/lib/dashboard-insights.ts`; category scores and measured moments are added deterministically to the stored report at generation time so the dashboard never needs transcripts.
- Answer review state lives in `answer_reviews` (owner-only RLS); cross-student averages come only from the `score_benchmark()` aggregate function, never raw rows; per the owner's decision the average is shown however small the sample.
- The admin portal is the separate top-level `/admin` route tree (own login + shell, `ssr: false`); staff permissions are enforced by RLS helper functions (`is_staff`, `can_operate`, `can_support`, `has_role`) and every sensitive admin write goes through audited SECURITY DEFINER functions.
- Private files (resources PDFs, support attachments, resumes) are served only via short-lived signed URLs; resource PDF downloads go through the authenticated `downloadResource` server function so every download is logged.
- Prep material sections reuse `resources` with `category` values from `src/lib/prep.ts`; announcements are staff-only posts with student likes/comments, comment author names stamped by a DB trigger so they can't be spoofed.
- SOP reviews live in `sop_reviews` (read-only to clients, written by `src/lib/sop.functions.ts` with the admin client); college sample SOPs reuse `college_training_docs` with kind `sop_sample`, which interviews must exclude.
- Student email alerts are sent only by the minutely scheduled job in `src/lib/notifications.server.ts`, which claims a per-record sent-at column before sending, so each alert goes out once and features never send email inline; wording comes from the staff-edited `email_templates` table.
- Pre-launch gating lives in browser-safe `src/lib/launch.ts`; the public page sits at `/` (`/courses` redirects there), locked students return to it with `?locked`, and public pages carry no purchase buttons — `/admin` keeps its own staff login.
- Single address: canonicals and sitemap use `SITE_URL`/`siteUrl()` from `src/lib/site.ts`; `signedOutTarget()` sends signed-out visitors to the public side.
