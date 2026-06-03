# Docs Editor

A minimal, production-quality document editor built with Next.js, Supabase, and TipTap. Supports rich-text editing, file uploads, and document sharing.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript) |
| Styling     | Tailwind CSS + shadcn/ui            |
| Database    | Supabase (Postgres + Auth)          |
| Editor      | TipTap (rich text)                  |
| Testing     | Vitest                              |

---

## Features

- Email/password authentication
- Create, rename, and delete documents
- Rich text editing: bold, italic, underline, headings (H1–H3), bullet and numbered lists
- Upload `.txt` / `.md` files as documents
- Share documents with other users (view or edit permission)
- Auto-save with 800ms debounce
- Row Level Security — users only see what they own or have been shared

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Settings → API**.

---

## Database Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in the Supabase dashboard.
3. Paste the entire contents of [`schema.sql`](./schema.sql) and click **Run**.

This creates:
- `profiles` — mirrors `auth.users`, populated by a trigger on sign-up
- `documents` — stores title and TipTap JSON content
- `document_shares` — tracks who has access and at what permission level
- RLS policies on all tables
- Helper RPCs (`get_user_id_by_email`, `my_access_level`)

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key

# 3. Apply the database schema
# Paste schema.sql into the Supabase SQL Editor and run it

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch
```

Tests are in `src/__tests__/` and cover:
- `document-utils.test.ts` — `textToTiptap` converter, file validation, filename parsing
- `shares.test.ts` — sharing action: auth guard, ownership check, self-share prevention, DB error handling

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login + signup pages
│   ├── (app)/           # Protected app shell (sidebar layout)
│   │   ├── dashboard/   # Document list page
│   │   └── doc/[id]/    # Editor page
│   └── api/
│       ├── upload/      # File upload route
│       └── auth/signout/
├── components/
│   ├── docs/            # DocList, DocCard, ShareDialog, UploadButton
│   ├── editor/          # Editor, Toolbar, DocEditor
│   └── ui/              # shadcn components (Button, Input, Dialog, Badge)
├── lib/
│   ├── actions/         # Server Actions (documents.ts, shares.ts)
│   ├── supabase/        # Client + server Supabase helpers
│   ├── document-utils.ts
│   ├── types.ts
│   └── utils.ts
└── middleware.ts         # Auth redirect
```

---

## Deployment

The easiest path is [Vercel](https://vercel.com):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings.

> Make sure **Site URL** in Supabase Auth settings matches your Vercel deployment URL to avoid redirect issues after email confirmation.
