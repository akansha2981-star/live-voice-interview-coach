# College-controlled interviews & premium document reviews

## 1. Booking and college settings
- Collect target college and actual interview date/time **when confirming a booking**, not only at equipment checks. Preserve the practice-only checkbox, which disables actual interview details, and the existing call-letter requirement for real interviews.
- Keep the compact date/time filters and independently scrollable slot column.
- Add college settings for total interview duration, main-question count and minimum/maximum answer time per question. Validate that the settings fit within the total duration, with a closing allowance.
- Snapshot the selected settings when an interview starts so later admin edits cannot change a live student's limits. Practice interviews use the existing general settings with an explicit question limit.

## 2. Strict interview control
- Replace the current extra five-minute grace with an enforced deadline, and close professionally at the configured time or after the final permitted answer finishes—whichever comes first.
- Keep the three-section content structure, direct questions, selected voice, camera/mic tracking and isolated transcript unchanged.
- Introduce an authoritative server-owned question lifecycle: identified main question, delivered question, answering and closing. Main questions count once; a clarification or repetition does not silently become an additional main question.
- Use controlled question delivery rather than relying on the prompt to count questions. Aria must not independently generate an uncounted extra question; case setup contains one clear ask.
- Per-question time ranges guide answer pacing. Reaching the maximum ends that answer window; the minimum is a target, not a forced silence when the student has finished. Show question number and remaining time without expanding the interview layout.
- At the count limit, allow the final answer within its remaining allotted time, then close. At the overall deadline, stop paid audio immediately and show **“Thank you for attending your interview.”** Save available transcript and metrics, then open the existing report flow. Do not hold a paid call open to finish a spoken closing beyond the deadline.
- Enforce limits server-side as well as on screen; preserve authentication, ownership checks and call cleanup. Interrupted questions, reconnects and repeated captions must not reset the count or deadline.

## 3. Genuine Resume Builder progress
- Replace timer-driven stage advancement with confirmed upload, reading, extraction and analysis events.
- Display the student's actual document in a private preview: PDF/image preview where supported, extracted text for Word files, and a clear unavailable-preview state when necessary.
- Show education, employment, skills and achievements only after extraction returns real values. Label missing fields as not found.
- Reveal ATS, keywords, issues and sentence replacements when validated processing results arrive. Keep incomplete fields pending, not filled with placeholders or invented scores.
- Premium light layout: document workspace, numbered stage rail, extracted-facts panels, score summaries and an interactive original/suggested-edit review. Preserve the one-analysis credit rule and existing downloads.

## 4. Genuine SOP Review progress
- Reuse the same preview and processing presentation for college fit, storytelling, motivation, career goals, writing and recommendations.
- Highlight exact source passages when they match the uploaded text; never approximate a highlight against a different sentence.
- Authenticity feedback concerns specificity and consistency in the writing, not a truthfulness or AI-authorship claim.
- Present the existing detailed scores, college fit, strengths, sentence feedback and action lists in a richer light workspace. Preserve saved reviews, turnaround labels and one-at-a-time submissions.

## Technical approach
- Add college configuration and interview-limit snapshots through additive backend changes with grants, RLS and audited admin writes. Extend the atomic booking/start operations without changing credit spending rules.
- Persist authoritative question progression and closing state; coordinate the live relay with bounded question delivery. Keep the existing voice hook lifecycle intact except for necessary limit/status events.
- Use authenticated streamed analysis events for incremental validated results, with stored owner-readable progress for reloads. A pending event is not a completed stage; failures end progress and show the safe error.
- Reuse the current models and streaming protocol. Do not add extra analysis calls just to animate the screen. If a staged extraction call is necessary for genuinely earlier facts, attribute and meter it explicitly; it adds AI usage rather than being free decoration.
- Share browser-safe document preview/progress components, evidence matching and stage definitions across the two tools. Keep private files behind short-lived signed URLs, and clean up local preview URLs.
- Retain finance attribution for every model request and preserve existing output limits, retry policies, ownership checks and report calculations.

## Validation
- Test exact duration/count boundaries, final-answer allowance, repetitions, reconnect persistence, invalid college settings, practice booking and college/date requirements.
- Verify admin settings save/read-back and student booking with selected details; confirm equipment checks still block unpaid entry when incomplete.
- Test real processing events: no timer-based completed stages, no facts before extraction, exact quote highlights and terminal failures.
- Check both review workspaces and the interview layout on desktop/mobile with reduced motion.
- A real voice interview and real resume/SOP processing are required before claiming live behavior verified; those calls incur the current service's AI usage. Do not silently switch to direct OpenAI or claim zero Lovable AI usage.

## Delivery boundaries
- This upgrade does not migrate AI billing, change model/voice selection, alter course payments, grant extra resume credits or introduce psychological camera scoring.
- Existing saved reports remain usable. Historic reviews without staged progress show their completed results, not reconstructed processing events.