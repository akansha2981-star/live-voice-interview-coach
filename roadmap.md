# Admin portal
- [x] Link created OpenAI connection and check model listing — Khushi's OpenAI linked; GET models returned HTTP 200; actual generation/realtime access still needs testing
- [x] Document future Lovable workspace transfer without rebuilding features — WORKSPACE-TRANSFER.md records connection, credential, data and acceptance checks; no workspace move performed
- [ ] Stage direct-API interview comparison without changing the student default — depends on compatible model access and voice adapter
- [ ] Compare full interviews, transcripts, tracking and reports — requires connected OpenAI and a live participant; baseline AI calls also consume Lovable credits
- [x] Match admin dashboard to the light student theme and group sidebar sections; authorized admin login, slot navigation and mobile menu verified
- [x] Fit live interview tracking, advanced observations, question and captions together without tracking scrolling; simulated layouts checked at 1280×900, 691×713, 390×844 and 390×700; real call remains pending below
- [x] Premium student UI refresh: shared navigation, overview, analytics, booking, prep, career, profile and support sections; signed-in desktop/mobile navigation and transcript access verified
- [x] Separate /admin login and 13-section portal (dashboard, users, purchases, interviews, slots, credits, resources, downloads, support, documents, reports, settings, audit)
- [x] Student Help & Support and SOP & Resources pages
- [ ] Razorpay payments and webhook — deferred by user (placeholder documented)
- [ ] Email notifications for ticket replies — not enabled yet

# Dashboard and interview workflow
- [x] Detailed light interview report: seven tabs, evidence-linked answers and timelines, communication/camera analysis, history/benchmarks, full PDF; real saved report, all tabs, desktop/mobile and eight-page PDF verified; unsupported metrics explicitly unavailable
- [x] Dashboard brief (10 sections): scores vs average, category tracker, answer review queue, moments, presentation, journey, comparison, priorities; interview = 3 sections × 3 questions
- [x] Mandatory working camera, visible face and microphone verification before interview — rule tests and signed-in blocked-start check passed; physical devices pending below
- [ ] Real Buy More Slots payments with automatic credit fulfilment — user deferred payment setup; price ₹100/interview confirmed
- [x] Self-service admin slot/date/time and credit management implemented using existing admin RLS
- [ ] Admin management end-to-end verification — Khushi has a student account, not admin access
- [x] Dashboard review: interview date/time, score, eye contact and transcript — verified with Khushi's existing history
- [ ] Khushi account booking and full live interview verification — requires a live participant for camera/mic answers
- [x] Advanced brief: measured audio, visual observations, question timing and configurable calm alerts — simulated browser checks, real call pending below
- [x] Twenty-metric report, evidence-based rubric, complete PDF/transcript and seven-day practice plan — synthetic report/PDF checked
- [x] Rule tests and desktop/mobile interview verification — simulations only; real devices pending below
- [x] Advanced interview tracking and isolated full-transcript scrolling (100-turn simulated browser checks; live participant verification remains below)
- [x] Compact clickable slot filters and viewport-bounded single-column list
- [x] Five-minute slot availability and bounded scrollable booking list
- [x] Formal white-and-blue dashboard and shared navigation
- [x] Admin-published slots, student booking and dashboard appointments
- [x] Internet, face and spoken microphone checks before entry
- [x] Distraction-free interview pop-up with visible questions and live signals
- [x] Rule tests, signed-in booking/read-back, connection check and mobile layout verification
- [ ] Real camera/microphone and audible interview verification — requires a live participant with camera and microphone
# Sidebar sections
- [x] My Slots page; equipment check removed from menu (runs automatically before each interview)
- [x] My Prep Material: Sample SOPs, GDPI Dockets, Domain Dossiers, Masterclasses & Workshops, GK Hub (admin managed)
- [x] Important Announcements feed (admin posts text/image/link; students like and comment)
- [ ] Admin posting end-to-end check — needs an admin sign-in in the preview
