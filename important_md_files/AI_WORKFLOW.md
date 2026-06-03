# AI Workflow — Docs Editor

This document describes how AI assistance (Claude Code) was used throughout this project, what was generated versus modified by hand, and how the output was verified.

---

## How AI Was Used

This project was built through an iterative conversation-driven workflow. The AI acted as a senior full-stack engineer collaborator, not an autonomous agent. Every significant output was reviewed before being accepted.

### Workflow pattern

1. **Prompt with intent and constraints** — Each prompt described a specific goal, the relevant stack, and quality requirements (e.g., "keep it simple", "production-ready", "no overengineering").
2. **AI generates an initial scaffold** — File structure, schema, component boilerplate, and logic were drafted in response.
3. **Human reviews and runs the code** — The generated code was reviewed in the IDE, the dev server was started, and actual behavior was observed.
4. **Errors and gaps are fed back** — Runtime errors, Supabase SQL errors, and type errors were pasted back into the conversation. The AI diagnosed and fixed them.
5. **Iterate** — Steps 3–4 repeated until each feature worked end-to-end.

---

## What Was AI-Generated

The following were produced almost entirely by AI and accepted with minimal manual changes:

| Artifact | Notes |
|---|---|
| `schema.sql` | Full Postgres schema including tables, indexes, RLS policies, triggers, and RPCs. Went through two revision cycles after discovering the RLS infinite recursion bug. |
| `src/lib/supabase/client.ts` / `server.ts` | Standard Supabase SSR setup per official docs. |
| `src/middleware.ts` | Cookie-based session refresh + auth redirect. |
| `src/lib/actions/documents.ts` | Server Actions for CRUD with ownership validation. |
| `src/lib/actions/shares.ts` | Server Actions for sharing — email lookup, self-share guard, upsert logic. |
| `src/components/editor/Editor.tsx` / `Toolbar.tsx` | TipTap setup with extensions, toolbar button groups, `onMouseDown` focus fix. |
| `src/components/ui/*` | shadcn-compatible Button, Input, Dialog, Badge without running the CLI. |
| `src/__tests__/*.test.ts` | Vitest tests for pure utilities and mocked server actions. |
| `README.md` | Setup instructions, project structure, deployment notes. |

---

## What Was Modified Post-Generation

These items required correction or had bugs caught during review:

| Issue | Root Cause | Fix |
|---|---|---|
| `next.config.ts` rejected at startup | Next.js 14 only supports `.mjs` / `.js` config | Renamed to `next.config.mjs` |
| Sign-up returned `Database error saving new user` | `profiles` table lacked an INSERT RLS policy; trigger was blocked | Added `profiles: service role insert` policy; added `exception when others` to trigger function |
| "Infinite recursion in policy for relation documents" on document create | `documents` shared-read policy queried `document_shares`; `document_shares` owner policy queried back to `documents` | Broke the cycle by replacing the back-reference with `shared_by = auth.uid()` on `document_shares` |
| Dashboard query used wrong column name `user_id` | Schema was revised mid-project from `doc_shares.user_id` to `document_shares.shared_with` but not all query sites were updated | Fixed dashboard and ShareDialog to use correct table and column names |
| `DocCard` referenced `createClient` after it was removed from imports | Incomplete refactor when switching from direct Supabase calls to server actions | Removed stale `const supabase = createClient()` line |
| `.txt` file with no MIME type was rejected | Validation checked MIME before extension; browsers sometimes send an empty string | Reordered to check extension first, treat empty MIME as acceptable |

---

## How Correctness Was Verified

### Manual testing
- Signed up for a new account and confirmed the `profiles` row was auto-created.
- Created, renamed, and deleted documents from the dashboard.
- Edited document content and confirmed auto-save persisted across page reloads.
- Uploaded `.txt` and `.md` files and verified the content appeared correctly in the editor.
- Shared a document with a second account, confirmed the recipient saw it under "Shared with me" at the correct permission level.
- Verified that a view-only recipient could not edit the title or content.

### Automated tests
- `textToTiptap` — edge cases for blank lines, empty input, whitespace preservation.
- `validateUploadedFile` — extension rejection, MIME bypass for empty type, size boundary.
- `shareDocument` — six test cases covering auth, ownership, self-share, missing account, success, and DB failure.

### Database verification
- Ran diagnostic SQL directly in the Supabase SQL Editor to confirm tables existed, trigger was installed, and RLS policies were active before troubleshooting auth errors.
- Tested the `profiles` INSERT path in isolation (`insert into profiles ...`) to isolate the trigger failure.

---

## Limitations and Known Trade-offs

- **Sharing lookup is email-based** via an RPC that reads `auth.users`. This is a common Supabase pattern but means users must have confirmed their email before they can be shared with.
- **No real-time collaboration** — multiple editors on the same document will overwrite each other. TipTap's Yjs extension would be needed for true concurrent editing, which was out of scope.
- **No pagination** on the dashboard — all documents are loaded at once. Acceptable for an MVP but would need a limit/cursor for large collections.
- **Content stored as JSONB** — this is efficient and TipTap-native, but makes full-text search non-trivial. Postgres `to_tsvector` on the JSON text nodes would be needed for search.
