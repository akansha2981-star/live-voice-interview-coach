# MBA Compass workspace-transfer checklist

## Goal
Reuse the existing platform when changing Lovable workspaces. A workspace move must not be treated as a reason to redesign interviews, rebuild dashboards, or replace business rules.

## Current verified state
- Khushi's OpenAI connection is linked to this project; its model-list request returned HTTP 200 on 27 October 2026.
- OpenAI integration has not replaced the current student AI path. A complete voice adapter and end-to-end comparison remain outstanding.
- Connector credentials are workspace-owned. Access in the destination workspace and project linkage must be checked rather than assumed to transfer.

## Before moving
1. Confirm the available project-transfer procedure in current Lovable settings and whether it preserves the existing project and Cloud backend. This checklist does not establish that cross-workspace transfer is supported or that all settings transfer automatically.
2. Prefer retaining the existing project and backend where supported. Remixing copies code into an independent project; it is not proof that production students, credits, bookings, reports or uploaded files moved.
3. Back up code through Git sync or code download. Export database data separately and plan private-file and auth migration if a new backend is necessary. Keep credentials out of downloads and Git.
4. Record active published URL/domain, payment callback/webhook settings, auth redirect settings and the target workspace's owners and billing responsibilities.

## Destination configuration
- Confirm access to the original Cloud data, auth users and private storage before opening the app to students. If a new backend is used, explicitly migrate and verify these instead.
- Recreate or relink OpenAI through the secure connector flow if needed; grant the destination project owner Can use. Never paste keys into chat or source code.
- Verify the generated connector environment-variable name. The present OpenAI connection is gateway-backed; use its returned gateway routing instructions, not a connection key against OpenAI directly.
- Confirm server-only payment credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and any other configured secrets through secure settings; do not assume they moved.
- Verify the destination Lovable gateway credentials, billing, publishing configuration and domain. Do not copy the old workspace's gateway key as a portability workaround.
- Keep integration credential reads configurable and server-side; do not bake workspace IDs, connection IDs or private keys into feature code.

## Acceptance checks before cutover
- Student and admin login and permissions.
- Existing balances, booked slots, transcripts, reports and private documents read back correctly.
- Booking, required camera/face/mic verification, live question/voice/transcript flow and report generation.
- Payment verification and credit fulfilment; confirm the current webhook/closed-checkout limitation separately before commercial use.
- Resume, SOP and college-training analysis.
- Published domain and auth redirects.
- Direct OpenAI AI billing after migration is implemented; hosting/storage and app-building costs remain separate.

## Limits
No workspace move or production migration has been performed. Relinking credentials and verifying data may still be necessary; zero-setup transfer and identical AI output are not guaranteed.