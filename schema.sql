-- ============================================================
-- Docs Editor — PostgreSQL Schema
-- Compatible with Supabase (auth.users is the users table)
-- Run this once in the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- SECTION 1: TABLES
-- ============================================================

-- users is provided by Supabase as auth.users.
-- We create a public profiles table to store display-friendly
-- data (email, display name) without exposing auth internals.
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

-- documents
-- content is stored as JSONB (TipTap JSON).
-- owner_id is a hard FK to auth.users so deleting a user
-- cascades to their documents.
create table if not exists documents (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users on delete cascade,
  title       text        not null default 'Untitled',
  content     jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- document_shares
-- One row per (document, recipient) pair.
-- permission is an enum-like check: 'view' | 'edit'.
-- Deleting a document cascades and removes all its shares.
-- A user cannot be shared the same document twice (unique constraint).
create table if not exists document_shares (
  id          uuid        primary key default gen_random_uuid(),
  doc_id      uuid        not null references documents on delete cascade,
  shared_with uuid        not null references auth.users on delete cascade,
  permission  text        not null default 'view'
                            check (permission in ('view', 'edit')),
  shared_by   uuid        not null references auth.users,
  created_at  timestamptz not null default now(),

  unique (doc_id, shared_with)
);

-- document_versions
-- Snapshots saved by editors/owners so documents can be restored.
-- Each version belongs to one document and records who saved it.
create table if not exists document_versions (
  id          uuid        primary key default gen_random_uuid(),
  doc_id      uuid        not null references documents on delete cascade,
  saved_by    uuid        not null references profiles on delete cascade,
  content     jsonb       not null,
  label       text,
  created_at  timestamptz  not null default now()
);

-- document_comments
-- Comments belong to a document and are authored by a user who can access it.
-- resolved is a simple boolean so threads can be reopened.
create table if not exists document_comments (
  id          uuid        primary key default gen_random_uuid(),
  doc_id      uuid        not null references documents on delete cascade,
  author_id   uuid        not null references profiles on delete cascade,
  body        text        not null,
  resolved    boolean     not null default false,
  created_at  timestamptz  not null default now()
);


-- ============================================================
-- SECTION 2: RELATIONSHIPS (summary)
-- ============================================================
--
--  auth.users (Supabase-managed)
--    │
--    ├─1:1──► profiles          (display name, email mirror)
--    │
--    ├─1:N──► documents         (owner_id → auth.users.id)
--    │          │
--    │          └─1:N──► document_shares  (doc_id → documents.id)
--    │                       │
--    │                       ├── shared_with → auth.users.id
--    │                       └── shared_by  → auth.users.id
--    │
--    └─1:N──► document_shares   (shared_with → auth.users.id)
--
--  Cascade rules:
--    • delete user  → deletes their profile, documents, shares
--    • delete doc   → deletes all its document_shares rows
-- ============================================================


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- Fast lookup of all documents owned by a user (dashboard query)
create index if not exists idx_documents_owner_id
  on documents (owner_id);

-- Fast lookup of all shares for a given user ("shared with me")
create index if not exists idx_document_shares_shared_with
  on document_shares (shared_with);

-- Fast lookup of all shares for a given document (share management)
create index if not exists idx_document_shares_doc_id
  on document_shares (doc_id);

-- Partial index: only 'edit' shares — used in access-check hot path
create index if not exists idx_document_shares_edit
  on document_shares (doc_id, shared_with)
  where permission = 'edit';

-- Fast lookup of version history for a given document
create index if not exists idx_document_versions_doc_id
  on document_versions (doc_id, created_at desc);

-- Fast lookup of comments for a given document
create index if not exists idx_document_comments_doc_id
  on document_comments (doc_id, created_at);

-- Fast lookup of comments by author for moderation and UI checks
create index if not exists idx_document_comments_author_id
  on document_comments (author_id);


-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- Auto-bump updated_at on every document update
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function fn_set_updated_at();

-- Mirror email into profiles on new user sign-up (Supabase auth hook)
create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'fn_handle_new_user failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();


-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

alter table profiles          enable row level security;
alter table documents         enable row level security;
alter table document_shares   enable row level security;
alter table document_versions  enable row level security;
alter table document_comments  enable row level security;

-- profiles: service role (trigger) can insert on sign-up
create policy "profiles: service role insert"
  on profiles for insert
  with check (true);

-- profiles: users can read any profile (needed for share lookups)
create policy "profiles: public read"
  on profiles for select
  using (true);

-- profiles: users can only update their own row
create policy "profiles: own update"
  on profiles for update
  using (id = auth.uid());

-- documents: owner can INSERT their own docs (no subquery — cannot recurse)
create policy "docs_insert"
  on documents
  for insert
  with check (owner_id = auth.uid());

-- documents: owner OR shared user can SELECT
create policy "docs_select"
  on documents
  for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from document_shares
      where doc_id      = documents.id
        and shared_with = auth.uid()
    )
  );

-- documents: owner OR shared editor can UPDATE
create policy "docs_update"
  on documents
  for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from document_shares
      where doc_id      = documents.id
        and shared_with = auth.uid()
        and permission  = 'edit'
    )
  );

-- documents: owner only can DELETE
create policy "docs_delete"
  on documents
  for delete
  using (owner_id = auth.uid());

-- document_shares: sharer (always the doc owner) manages their shares.
-- Uses shared_by — avoids a back-reference to documents that would
-- cause infinite recursion with the docs_select policy above.
create policy "shares_owner"
  on document_shares
  for all
  using    (shared_by = auth.uid())
  with check (shared_by = auth.uid());

-- document_shares: recipient can read their own share row
create policy "shares_recipient_select"
  on document_shares
  for select
  using (shared_with = auth.uid());

-- document_versions: anyone with document access can read version history
create policy "versions_select"
  on document_versions
  for select
  using (
    exists (
      select 1 from documents
      where id = doc_id
        and (
          owner_id = auth.uid()
          or exists (
            select 1 from document_shares
            where doc_id = documents.id
              and shared_with = auth.uid()
          )
        )
    )
  );

-- document_versions: owners and shared editors can save snapshots
create policy "versions_insert"
  on document_versions
  for insert
  with check (
    saved_by = auth.uid()
    and exists (
      select 1 from documents
      where id = doc_id
        and (
          owner_id = auth.uid()
          or exists (
            select 1 from document_shares
            where doc_id = documents.id
              and shared_with = auth.uid()
              and permission = 'edit'
          )
        )
    )
  );

-- document_comments: anyone with document access can read comments
create policy "comments_select"
  on document_comments
  for select
  using (
    exists (
      select 1 from documents
      where id = doc_id
        and (
          owner_id = auth.uid()
          or exists (
            select 1 from document_shares
            where doc_id = documents.id
              and shared_with = auth.uid()
          )
        )
    )
  );

-- document_comments: anyone with document access can add a comment
create policy "comments_insert"
  on document_comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from documents
      where id = doc_id
        and (
          owner_id = auth.uid()
          or exists (
            select 1 from document_shares
            where doc_id = documents.id
              and shared_with = auth.uid()
          )
        )
    )
  );

-- document_comments: allow document participants to toggle resolution
create policy "comments_update"
  on document_comments
  for update
  using (
    exists (
      select 1 from documents
      where id = doc_id
        and (
          owner_id = auth.uid()
          or exists (
            select 1 from document_shares
            where doc_id = documents.id
              and shared_with = auth.uid()
          )
        )
    )
  );

-- document_comments: authors can delete their own comments
create policy "comments_delete"
  on document_comments
  for delete
  using (author_id = auth.uid());


-- ============================================================
-- SECTION 6: HELPER FUNCTIONS (RPCs)
-- ============================================================

-- Resolve an email → user_id (used by ShareDialog to share by email)
-- security definer so it can read auth.users without exposing the table
create or replace function get_user_id_by_email(email_input text)
returns uuid
language sql security definer
as $$
  select id
  from auth.users
  where email = lower(trim(email_input))
  limit 1;
$$;

-- Check whether the calling user can edit a given document
-- Returns: 'owner' | 'edit' | 'view' | null (no access)
create or replace function my_access_level(doc_id_input uuid)
returns text
language sql security definer stable
as $$
  select case
    when exists (
      select 1 from documents
      where id = doc_id_input and owner_id = auth.uid()
    ) then 'owner'
    when exists (
      select 1 from document_shares
      where doc_id = doc_id_input and shared_with = auth.uid() and permission = 'edit'
    ) then 'edit'
    when exists (
      select 1 from document_shares
      where doc_id = doc_id_input and shared_with = auth.uid()
    ) then 'view'
    else null
  end;
$$;


-- ============================================================
-- SECTION 7: EXAMPLE QUERIES
-- ============================================================

-- ------------------------------------------------------------
-- Q1: Get my documents (owned), newest first
-- ------------------------------------------------------------
-- select *
-- from documents
-- where owner_id = auth.uid()
-- order by updated_at desc;


-- ------------------------------------------------------------
-- Q2: Get documents shared with me, with permission level
-- ------------------------------------------------------------
-- select
--   d.id,
--   d.title,
--   d.content,
--   d.updated_at,
--   ds.permission,
--   p.email        as owner_email,
--   p.display_name as owner_name
-- from document_shares ds
-- join documents d  on d.id  = ds.doc_id
-- join profiles  p  on p.id  = d.owner_id
-- where ds.shared_with = auth.uid()
-- order by d.updated_at desc;


-- ------------------------------------------------------------
-- Q3: Check access level for a specific document
--     (use the RPC above, or inline version:)
-- ------------------------------------------------------------
-- select
--   case
--     when d.owner_id = auth.uid()          then 'owner'
--     when ds.permission = 'edit'           then 'edit'
--     when ds.permission = 'view'           then 'view'
--     else                                       'none'
--   end as access_level
-- from documents d
-- left join document_shares ds
--        on ds.doc_id      = d.id
--       and ds.shared_with = auth.uid()
-- where d.id = '<document_id>'
-- limit 1;


-- ------------------------------------------------------------
-- Q4: List all people a document is shared with (for the owner)
-- ------------------------------------------------------------
-- select
--   p.email,
--   p.display_name,
--   ds.permission,
--   ds.created_at as shared_at
-- from document_shares ds
-- join profiles p on p.id = ds.shared_with
-- where ds.doc_id = '<document_id>'
-- order by ds.created_at;


-- ------------------------------------------------------------
-- Q5: Dashboard — both owned and shared in one query
-- ------------------------------------------------------------
-- select
--   d.id,
--   d.title,
--   d.updated_at,
--   'owner'        as source,
--   'owner'        as permission
-- from documents d
-- where d.owner_id = auth.uid()
--
-- union all
--
-- select
--   d.id,
--   d.title,
--   d.updated_at,
--   'shared'       as source,
--   ds.permission
-- from document_shares ds
-- join documents d on d.id = ds.doc_id
-- where ds.shared_with = auth.uid()
--
-- order by updated_at desc;
