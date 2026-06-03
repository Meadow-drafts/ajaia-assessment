Walkthrough Script — Docs Editor (3–5 minutes)

Goal: A short, focused demo showing the main user flows, what works end-to-end, what was deprioritized, and how AI helped.

Timing guide: Aim for ~4 minutes total.

00:00–00:15 — Intro
- Narration: "Hi — I built a lightweight collaborative document editor using Next.js, TipTap, and Supabase. I'll demo creating, editing, uploading, and sharing a document, plus explain key design decisions and AI usage."
- Action: Show app landing page or repo README briefly.

00:15–00:45 — Login & Dashboard
- Narration: "I'll sign in with a seeded account (or sign up). The dashboard shows documents I own and documents shared with me."
- Action: Click `Login` → sign in. Point to an "Owned" document list and a "Shared with me" section.

00:45–01:30 — Create + Rename Document
- Narration: "Create a new document, give it a name, and open it. You can rename from the editor header."
- Action: Click `New Document` → type title "Demo Doc" → open. In editor header, change title and blur to save. Mention auto-save debounce (800ms).

01:30–02:10 — Editor: Formatting & Auto-save
- Narration: "The editor supports bold, italic, underline, headings, and lists. Edits are auto-saved with minimal delay."
- Action: Type sample content, apply bold and italic, add heading and bullet list. Pause to show save indicator (Saved / Saving). Refresh the page to show persistence.

02:10–02:40 — File Upload / Import
- Narration: "You can upload `.txt` or `.md` files to import content as new documents.
- Action: Open Upload dialog, choose a `.md` or `.txt` file, show it becomes a new document in the dashboard and open it to confirm content.

02:40–03:10 — Sharing Flow
- Narration: "Document owners can share via email with `view` or `edit` permissions. Sharing resolves the email to an account and prevents sharing with yourself."
- Action: Open `Share` dialog for a document, enter a collaborator email (seeded account), set `edit` permission, submit. Re-login as the collaborator (or switch window) and show the document appears in `Shared with me` and that permissions are enforced.

03:10–03:35 — Persistence, Security, and Tests
- Narration: "Content is persisted in Supabase Postgres as TipTap JSONB. Row-Level Security ensures users only see owned/shared docs. The repo includes Vitest unit tests for utilities and sharing actions."
- Action: Show `schema.sql` briefly and the test file `src/__tests__/shares.test.ts`, then run `npm test` (optional screen-record of terminal).

03:35–04:05 — What I Deprioritized & Known Limitations
- Narration: "I intentionally deprioritized real-time collaborative cursors / CRDT merging (would use Yjs), pagination, and full-text search over rich JSON. These are documented in ARCHITECTURE.md."
- Action: Point to [ARCHITECTURE.md](ARCHITECTURE.md) and mention trade-offs.

04:05–04:30 — AI Usage & Verification
- Narration: "I used AI to scaffold schema, server actions, and UI components. I audited, tested, and fixed generated code — AI helped accelerate iterative development but I verified behavior manually and via unit tests."
- Action: Show `AI_WORKFLOW.md` and call out a few examples (schema, actions, tests).

04:30–04:50 — Deployment & How to Run Locally
- Narration: "The app runs locally with `npm install` and `npm run dev`. Recommended deployment is Vercel. See README for setup and Supabase schema installation steps."
- Action: Show README section and the local start command in terminal.

04:50–05:00 — Closing
- Narration: "Thanks — links to the repo, the live demo, architecture note, AI workflow, and the short submission checklist are in the repo. Happy to answer questions."
- Action: Pause on README or SUBMISSION.md with the live URL placeholder.

Recording tips
- Keep the mouse movements intentional and slow. Use keyboard where possible.
- Narrate actions clearly and keep each segment within the timing guide.
- If you can't re-login during recording, pre-record the collaborator view or switch windows quickly.

Suggested Files to Show in the Video
- `README.md` — setup and deployment steps
- `ARCHITECTURE.md` — design decisions
- `AI_WORKFLOW.md` — AI usage note
- `src/__tests__/shares.test.ts` — example test

Commands to run locally (include in video caption)
```bash
npm install
cp .env.local.example .env.local
# paste Supabase vars into .env.local
# run schema.sql in Supabase SQL Editor
npm run dev
```


End of script.
