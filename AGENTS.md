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
- Slot availability and booking use database functions with row locks; equipment checks are recorded through authenticated server functions before the atomic start_interview credit spend.
- Fetch slot availability in ordered pages so dense schedules are not truncated by the Data API row limit.
- The interview route uses a full-viewport accessible dialog while keeping the existing voice hook and transport lifecycle unchanged.
- Interview presentation lives in a browser-safe workspace; transcript following changes only its own scroll container so caption updates never move the room.
- tsconfig relaxes noPropertyAccessFromIndexSignature/noUncheckedIndexedAccess/exactOptionalPropertyTypes/noImplicitReturns to keep UI code readable.
