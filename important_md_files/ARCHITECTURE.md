# Architecture Note — Docs Editor

Overview

A lightweight collaborative document editor built using Next.js (App Router), TipTap for rich-text editing, and Supabase (Postgres + Auth) for persistence and sharing. The app focuses on a clear, secure, and testable MVP delivering document creation, rich editing, file import, and simple sharing.

Key Components

- Frontend: Next.js 14 App Router + React, TipTap editor for rich-text. UI components follow shadcn patterns and Tailwind CSS for styling.
- Backend: Supabase Postgres for data storage and Auth. Server Actions handle document CRUD and sharing operations.
- Data model:
  - `profiles` mirrors `auth.users` (trigger on signup)
  - `documents` stores `id`, `title`, `owner_id`, and TipTap JSON content in a `jsonb` column
  - `document_shares` stores `doc_id`, `shared_with`, `shared_by`, and `permission` (view/edit)
- Security: Row-Level Security (RLS) policies restrict access so users only see owned or explicitly shared documents. RPC `get_user_id_by_email` resolves emails to user IDs for sharing.

Design Decisions & Priorities

- TipTap JSONB storage: preserves editor state and formatting; chosen for precise round-trip fidelity between editor and DB.
- Email-based sharing: simple UX and easy to implement with Supabase RPC; requires recipient to have an account.
- Auto-save debounce: 800ms to balance responsiveness and DB load.
- No real-time OT/CRDT: out of scope — would require Yjs or similar for true concurrent editing.

Trade-offs & Limitations

- No live collaborative cursors or conflict resolution — simultaneous edits will overwrite each other.
- Search over rich content is limited; JSONB requires extracting text for full-text indexing.
- Sharing requires an existing account for the target email.

Testing & Verification

- Unit tests for utilities and server actions (Vitest).
- Manual end-to-end verification performed for sign-up, document create/edit/save, file upload import, and sharing flows.

Deployment

- Recommended: Vercel for Next.js. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in environment variables and Supabase Auth Site URL matches the deployed site.

