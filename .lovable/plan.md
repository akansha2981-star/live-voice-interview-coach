# Admin Finance & Costing Dashboard

## What you get
- A dedicated **Finance & costing** page under the admin sidebar’s **Courses & payments** group, matching the formal light MBA Compass theme, Calibri and text-only controls.
- Date filters for today, week, month and custom ranges; daily/monthly spending trends, product breakdowns and downloadable CSV reports that open in Excel.
- Separate totals for **verified billed expenses**, **usage-based estimates**, and **costs not yet available**. Missing records never display as zero spending or a zero balance.

## Dashboard sections
1. **Overall spending:** billed expenditure, estimated accrued costs, daily/monthly totals, provider expenses, developer expenses and cumulative trends. Totals remain separated by currency unless a recorded conversion rate supports INR conversion.
2. **Product costing:** interviews, Resume Builder, SOP Review and training-document analysis, with completed/failed counts, usage coverage, expenditure, cost per attempt and cost per successful transaction.
3. **Interview economics:** live voice, delegated questions and report generation linked to the same interview; average per complete interview and per user. Show normalized 1-, 5- and 10-minute projections from observed durations, clearly labelled as estimates—not measured interviews of those lengths. Browser camera/mic analysis has no separate provider call; do not invent video-processing fees or double-count transcription bundled into live voice.
4. **Provider/model usage:** recorded input/output tokens, reasoning/audio details when supplied, service quantities and pricing basis. Keep Lovable credit usage separate from cash expenses; do not convert credits to rupees using a guessed rate.
5. **Expense register:** add developer, personal API, hosting and other verified/manual expenses with date, provider, product, amount, currency, reference and notes. Link invoices to covered usage; billed entries replace covered estimates in reconciled totals rather than being added twice.
6. **OpenAI balance:** manual available-balance and spending-limit snapshots with currency and as-of date. Automatic billing access is enabled only if the existing connection supports the required billing permissions; the normal model-access key does not establish balance access. Manual limits are informational, not provider-enforced caps.
7. **Sales context:** surface resume/SOP/interview cost summaries alongside recorded purchase totals, without claiming profit when payment status, currency conversion or cost coverage is incomplete.

## Accuracy and rollout
- Begin automatic usage recording when this feature is installed. Existing transactions still appear in activity counts, but historical costs remain unavailable unless imported from verifiable records.
- Preserve current models, voice, booking, payment and assessment behavior. This dashboard does **not** switch the app to direct OpenAI billing.
- Use actual provider usage where returned; configurable effective-dated rates produce estimates with their original pricing snapshot. Invoice/manual billed entries remain explicitly labelled by source.
- Store only usage metadata and safe references—not prompts, transcripts, API keys or raw credential-bearing logs.
- Restrict finance reads to admins, operations staff and analysts; restrict expense/pricing/balance writes to admins and operations staff, with server-side authorization and audit records.

## Technical implementation
- Add backend tables for usage events, effective-dated service rates, financial entries, reconciliation links and balance snapshots. Apply explicit grants, RLS and audited write functions using existing staff permission helpers.
- Add a server-only usage recorder around the existing structured-AI and live-interview completion paths. Attribute records to product, user and transaction with unique provider/event references so duplicate callbacks cannot duplicate spending.
- Compute summaries with bounded, ordered reads or database aggregates; retain usage units and currencies rather than using a blended token rate.
- Keep calculations in a browser-safe finance module with tests for missing costs, currency separation, duration projections, effective rates and reconciliation.
- Add the admin page, sidebar link and contextual sales summaries using existing admin controls and chart patterns; include page-specific metadata.

## Verification
- Test concrete costing and permission rules, duplicate-event handling, reconciliation and CSV values.
- Verify authorized expense entry, save/read-back, date filters, rate changes and export; confirm student access is blocked.
- Check desktop/mobile layout and empty/partial-history states. Do not create paid interviews merely to populate charts.
- Verify usage ingestion against the next explicitly started real AI task; until then label live ingestion unverified rather than claiming accurate historical spending.