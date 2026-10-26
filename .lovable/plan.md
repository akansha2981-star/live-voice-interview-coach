# MBA Compass AI Interview — Version 1 (Core Interview Loop)

Version 1 covers the main flow from the brief: sign in, profile, live voice interview with webcam feedback, and a scored report. Booking, payments, and the full admin portal come in later versions.

## What students get
1. **Sign in** with email/password or Google.
2. **Dashboard**: how complete their profile is, interview credits left, a "Start interview" card, and past reports.
3. **Professional profile**: education, work experience, target role and industry, skills, projects, career goals, difficulty level, plus a resume upload (PDF/DOCX). AI pulls details out of the resume and the student checks and edits them. The student also picks which details the interviewer may use.
4. **Pre-interview check**: camera and microphone test, lighting and framing guidance, consent to recording and analysis.
5. **Live AI interview** (about 15–20 minutes): a natural spoken conversation where the student can interrupt the AI interviewer. It asks questions based on the student's profile and resume, follows up on answers, and covers behavioural, role-specific and reasoning questions. A live captions panel runs alongside.
6. **Live webcam feedback**, all processed in the browser: whether the face is visible, head direction, approximate eye direction, posture and framing, plus speaking pace and filler words. These are shown as gentle coaching tips, never as judgements about honesty, personality or emotions.
7. **Report**: an overall readiness score and scores for communication, answer quality, subject knowledge, structured thinking, presentation and etiquette. Each question gets its own evaluation, a better sample answer, and quotes from the transcript with timestamps. It ends with a step-by-step improvement plan. Students can download the report as a PDF, and separately download the transcript.
8. **History**: past interviews and score trends over time.

## What admins get (basic)
- Admin role, stored safely in a separate roles table.
- A list of students, where admins can grant or remove interview credits.
- A read-only view of any student's reports.

## Look and feel
A professional, calm career-coaching style: deep ink navy with a warm amber accent, a distinctive serif font for headings, and a clean sans-serif for body text.

## Technical details
- Lovable Cloud: auth, tables (profiles, user_roles, credits ledger, interviews, transcript_turns, vision_samples, reports), RLS so each student sees only their own rows, and private storage for resumes and reports.
- Live voice: the Lovable AI Live session (`openai/gpt-live-1`) with client delegation through a server relay. The backend model `openai/gpt-6-astra` handles question planning. Profile and resume details go into the session instructions. One credit is used atomically when an interview starts.
- Vision: MediaPipe Face Landmarker and Pose in the browser, sampling about 2 times a second and saving summaries with timestamps (no raw video by default).
- Resume parsing: text is extracted on the server, then structured with Astra using a strict JSON schema.
- Report: a server function scores the transcript and vision summary against a rubric (strict schema output). The PDF is built with pdf-lib in a Worker-safe way.
- The AI-provider adapter is kept behind a single server module so other providers can be added later.

## Deferred to later versions
Payments and LMS webhooks, slot booking and reminders, question bank and rubric editor, provider and usage-cost admin, notifications, audit logs, multi-tenant setup.
