// ============================================================
// Supabase integration examples — Next.js App Router
//
// Three contexts, three different clients:
//   1. Server Components / Route Handlers  → createServerClient()
//   2. Client Components                   → createBrowserClient()
//   3. Middleware                          → createServerClient() (no cookies())
//
// All auth reads use getUser() — never getSession() —
// because getSession() trusts the JWT without server verification.
// ============================================================

import { createClient as serverClient } from "./server";  // server-only
import { createClient as browserClient } from "./client"; // browser-only


// ─────────────────────────────────────────────────────────────
// AUTH — EMAIL / PASSWORD
// ─────────────────────────────────────────────────────────────

// Sign up (client component)
export async function signUp(email: string, password: string) {
  const supabase = browserClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  // Supabase sends a confirmation email by default.
  // data.user is set even before email confirmation.
  return { user: data.user, error };
}

// Sign in (client component)
export async function signIn(email: string, password: string) {
  const supabase = browserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { session: data.session, error };
}

// Sign out (client component or route handler)
export async function signOut() {
  const supabase = browserClient();
  await supabase.auth.signOut();
}


// ─────────────────────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────────────────────

// Server Component — reads the verified user from the server
// Use this in layouts, pages, and server actions.
export async function getCurrentUser() {
  const supabase = await serverClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

// Client Component — reads the verified user from the browser
// Useful in hooks or client-side conditional rendering.
export async function getCurrentUserClient() {
  const supabase = browserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}


// ─────────────────────────────────────────────────────────────
// DOCUMENTS — SERVER SIDE (Server Components / Route Handlers)
// ─────────────────────────────────────────────────────────────

// Fetch all documents owned by the current user
export async function getMyDocuments() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Fetch documents shared with the current user, including owner info
export async function getSharedWithMe() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("document_shares")
    .select(`
      permission,
      documents (
        id,
        title,
        updated_at,
        profiles ( email, display_name )
      )
    `)
    .eq("shared_with", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Fetch a single document by ID (with access check via RLS)
// Returns null if the user has no access.
export async function getDocument(id: string) {
  const supabase = await serverClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  // RLS returns an error with code PGRST116 if the row doesn't exist
  // or the user has no access — both cases we treat as "not found"
  if (error) return null;
  return data;
}

// Check what access level the current user has for a document.
// Uses the my_access_level() RPC defined in schema.sql.
// Returns: 'owner' | 'edit' | 'view' | null
export async function getAccessLevel(docId: string) {
  const supabase = await serverClient();
  const { data } = await supabase.rpc("my_access_level", {
    doc_id_input: docId,
  });
  return data as "owner" | "edit" | "view" | null;
}


// ─────────────────────────────────────────────────────────────
// DOCUMENTS — CLIENT SIDE (Client Components / hooks)
// ─────────────────────────────────────────────────────────────

// Save document content (debounce this in practice — see DocEditor.tsx)
export async function saveDocumentContent(id: string, content: object) {
  const supabase = browserClient();
  const { error } = await supabase
    .from("documents")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error;
}

// Rename a document
export async function renameDocument(id: string, title: string) {
  const supabase = browserClient();
  const { error } = await supabase
    .from("documents")
    .update({ title: title.trim() })
    .eq("id", id);
  return error;
}

// Create a new blank document and return its ID
export async function createDocument() {
  const supabase = browserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title: "Untitled", content: null })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

// Delete a document
export async function deleteDocument(id: string) {
  const supabase = browserClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);
  return error;
}


// ─────────────────────────────────────────────────────────────
// SHARING
// ─────────────────────────────────────────────────────────────

// Share a document with a user by email
export async function shareDocument(
  docId: string,
  email: string,
  permission: "view" | "edit"
) {
  const supabase = browserClient();

  // Resolve email → user_id via the RPC in schema.sql
  const { data: userId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { email_input: email }
  );

  if (lookupError || !userId) {
    return { error: "No account found for that email address." };
  }

  const { error } = await supabase.from("document_shares").upsert({
    doc_id: docId,
    shared_with: userId,
    permission,
    shared_by: (await supabase.auth.getUser()).data.user?.id,
  });

  return { error: error?.message ?? null };
}

// Revoke a share
export async function revokeShare(shareId: string) {
  const supabase = browserClient();
  const { error } = await supabase
    .from("document_shares")
    .delete()
    .eq("id", shareId);
  return error;
}


// ─────────────────────────────────────────────────────────────
// HOW TO STORE + LOAD TIPTAP CONTENT
// ─────────────────────────────────────────────────────────────
//
// STORING:
//   const json = editor.getJSON();   // plain JS object, safe to JSON.stringify
//   await saveDocumentContent(docId, json);
//
//   Store as JSONB in Postgres — no serialization needed.
//   The column type is `jsonb` in documents.content.
//
// LOADING:
//   const doc = await getDocument(id);
//   // Pass doc.content directly to the Editor component:
//   <Editor content={doc.content} onChange={handleChange} />
//
//   TipTap accepts the raw JSON object via its `content` prop.
//   If content is null (new doc), pass null — the Editor handles it.
//
// PATTERN — debounced autosave in a component:
//
//   const saveTimer = useRef<ReturnType<typeof setTimeout>>();
//
//   function handleChange(json: object) {
//     clearTimeout(saveTimer.current);
//     saveTimer.current = setTimeout(() => {
//       saveDocumentContent(docId, json);
//     }, 800);
//   }
//
// ─────────────────────────────────────────────────────────────
