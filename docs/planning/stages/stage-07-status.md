# Stage 07 — Simulado PTE Academic

Date: 2026-10-17 UTC
Status: implementation delivered; independent assessment pending.

## Delivered
- `/exam`: complete reference blueprint, individual part, mini, stock omissions and source filtering.
- Stratified deterministic selection without duplicates; reference blueprint 65 items, mini 22.
- Forward-only runner, persisted absolute deadlines and one-shot audio consumption, protected practice/session entry points.
- Timed auto-submit through all four engine groups; existing engines reused without showing immediate results.
- Exam-tagged attempts feed SRS; durable per-session scores survive attempt-log truncation.
- Skill estimates/confidence/target/practice/prior-exam comparisons and type averages in separate tabs.
- Weak areas, reinforcement-session link, local archive/history.

## Evidence
- Full vitest suite: 275/275, including 9 new exam tests.
- Lint: zero errors, 9 existing fast-refresh warnings.
- Harness build log latest: build OK 2026-10-17T19:50:22Z. Manual build/typecheck intentionally not run under platform policy.
- Playwright complete Reading part: 15 questions submitted, summary, archive, reload/history, 15 exam-tagged attempts; no page errors.
- Playwright timed submissions: A read_aloud → repeat_sentence, D dropdown cursor 1, B sst → listening MCQ, C listening MCQ cursor 2.
- Audio consumed once, disabled, remains disabled after reload; Read Aloud model hidden; practice bypass blocked.
- Desktop 1280×1800 and mobile 390×844; zero horizontal overflow. Screenshots in /tmp/browser/exam.

## Official-source verification and honest limits
- Pearson enhanced report pp. 5–6 reference counts match all 22 rows, total 65. Report says approximately 65, score guide 65–75: not guaranteed fixed live-test count.
- Official current test-format speaking-writing page orders SGD before RTS; report table differs. Current website order retained.
- Official speaking-writing: RA preparation 30–40 s, variable response; app 35/40 allocations now explicitly approximate. DI 25/40; RL 10/40; SGD 10/120; RTS 10/40; RS 15; ASQ 10; SWT 600; essay 1200.
- Reading 23–30 min, Listening 31–39 min, Speaking/Writing 76–84 min verified on current Pearson pages. Reading/most Listening per-item budgets remain labeled approximations.
- Timers for speaking audio tasks currently include preparation and answer allocation but do not wait for prompt playback to end. Synthesized audio duration varies by device; this is a remaining fidelity limitation, not an official timed reproduction.
- SST 10 minutes includes listening/writing. No personal introduction (unscored, outside 22 types).
- Real microphone, Safari and device voice quality still require manual checks.

## Follow-up fidelity (2026-10-17, second delivery)

- Audio prompts now precede answer timing in the exam: `EXAM_AUDIO_PROMPTS` (12 types — repeat_sentence, retell_lecture, answer_short, sgd, wfd, sst, and the 6 listening types; read_aloud, describe_image and rts stay text-first) plus `examPromptWaits`.
- `ExamPromptProvider`/`useExamPromptEnd` (src/components/practice/ExamPrompt.tsx): AudioPlayOnce and SgdEngine notify when the prompt playback ends (or is stopped); ExamRunner arms the deadline only then — timer shows "—" and submission stays disabled during the wait.
- Honest escape: "Não consigo ouvir o áudio — iniciar o tempo" arms the deadline without consuming silence (it claims the 1× audio). Registered approximations: recording can start before playback ends; reloading mid-playback requires the escape button (audio already consumed, no replay); synthesized audio duration varies by device.
- Gates re-run: vitest 277/277 (two new tests: the 12-type membership partition over the 22 official types; claim alone does not arm the deadline), tsgo clean, build OK, lint 0 errors (9 pre-existing warnings), Playwright mini-exam: read_aloud prep→answer unchanged, repeat_sentence waits with "—" and blocked submit, deadline arms at 0:14 after playback, describe_image immediate, console clean at 1280×1800.

- Monitor re-evaluation (2026-10-17): verdict "concluída", high confidence — see docs/planning/reports/stage-07-eval.md. All 5 recommendations addressed: roadmap mirror synced (docs/planning/ROADMAP.md Fase 7), retroactive stage-06 status written, SgdEngine now also notifies prompt end on utterance.onerror, and the follow-up flow was verified at 390×844 (waiting state, escape button arms at 0:14, zero horizontal overflow, console clean). Gates re-run after those edits: vitest 277/277, tsgo clean, build OK, lint 0 errors (9 pre-existing warnings).

## Source URLs
- https://www.pearsonpte.com/content/dam/ELL/pte/pearsonpte/research-report-pdfs/2025-07--enhanced-pte-a-report.pdf
- https://www.pearsonpte.com/pte-academic/test-format/speaking-writing/
- https://www.pearsonpte.com/pte-academic/test-format/reading/
- https://www.pearsonpte.com/pte-academic/test-format/listening/

## Follow-up check
Check new files/phases for five minutes or up to ten attempts before advancing; do not claim a background watcher is running.