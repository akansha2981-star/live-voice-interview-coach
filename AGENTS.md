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
- Live voice interviews go through `src/lib/live-relay.server.ts` (dispatched at `/api/live` in `src/server.ts`, dev via `live-vite-plugin.ts`); the relay verifies the Supabase token + interview ownership in `interview-session.server.ts` before opening a paid session.
- Interview credits are a ledger (`credit_ledger`); spending happens only in the `start_interview()` SQL function so it stays atomic.
- `interviews` is read-only to clients; all writes (transcript, report) go through server functions in `src/lib/interview.functions.ts` using the admin client after an ownership check.
- Webcam analysis runs only in the browser (`src/lib/vision.ts`); only aggregated metrics are stored, never video.
- Microphone signal analysis reuses the existing voice stream and cleans up with the call; only aggregated energy metrics are saved, never recordings.
- Report schema and rubric calculations are browser-safe pure modules; deterministic weighted ability scoring excludes camera-derived coaching.
- Slot availability and booking use database functions with row locks; equipment checks are recorded through authenticated server functions before the atomic start_interview credit spend.
- Fetch slot availability in ordered pages so dense schedules are not truncated by the Data API row limit.
- Dashboard transcript detail is fetched on demand; interview history reads lightweight summary metrics rather than every transcript.
- The interview route uses a full-viewport accessible dialog while keeping the existing voice hook and transport lifecycle unchanged.
- Interview presentation lives in a browser-safe workspace; transcript following changes only its own scroll container so caption updates never move the room.
- tsconfig relaxes noPropertyAccessFromIndexSignature/noUncheckedIndexedAccess/exactOptionalPropertyTypes/noImplicitReturns to keep UI code readable.
- Dashboard insights are computed by the browser-safe `src/lib/dashboard-insights.ts`; category scores and measured moments are added deterministically to the stored report at generation time so the dashboard never needs transcripts.
- Answer review state lives in `answer_reviews` (owner-only RLS); cross-student averages come only from the `score_benchmark()` aggregate function with a minimum sample size, never raw rows.
- The admin portal is the separate top-level `/admin` route tree (own login + shell, `ssr: false`); staff permissions are enforced by RLS helper functions (`is_staff`, `can_operate`, `can_support`, `has_role`) and every sensitive admin write goes through audited SECURITY DEFINER functions.
- Private files (resources PDFs, support attachments, resumes) are served only via short-lived signed URLs; resource PDF downloads go through the authenticated `downloadResource` server function so every download is logged.
- Prep material sections reuse `resources` with `category` values from `src/lib/prep.ts`; announcements are staff-only posts with student likes/comments, comment author names stamped by a DB trigger so they can't be spoofed.
- SOP reviews live in `sop_reviews` (read-only to clients, written by `src/lib/sop.functions.ts` with the admin client); college sample SOPs reuse `college_training_docs` with kind `sop_sample`, which interviews must exclude.
