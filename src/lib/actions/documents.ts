"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

// Verify caller owns the document before any mutation
async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, docId: string, userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", docId)
    .eq("owner_id", userId)
    .single();

  if (error || !data) throw new Error("Document not found or access denied");
}

// Shared return shape for all actions
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };


// ─────────────────────────────────────────────────────────────
// CREATE DOCUMENT
// ─────────────────────────────────────────────────────────────

export async function createDocument(): Promise<never> {
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title: "Untitled", content: null })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create document");

  revalidatePath("/dashboard");
  redirect(`/doc/${data.id}`);
}


// ─────────────────────────────────────────────────────────────
// CREATE DOCUMENT FROM FILE CONTENT (used by upload flow)
// ─────────────────────────────────────────────────────────────

export async function createDocumentFromContent(
  title: string,
  content: object
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from("documents")
      .insert({ owner_id: user.id, title: title.trim() || "Untitled", content })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Insert failed");

    revalidatePath("/dashboard");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ─────────────────────────────────────────────────────────────
// UPDATE DOCUMENT CONTENT
// ─────────────────────────────────────────────────────────────

export async function updateDocumentContent(
  docId: string,
  content: object
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Allow owner OR shared user with 'edit' permission
    const { data: access } = await supabase
      .rpc("my_access_level", { doc_id_input: docId });

    if (!access || access === "view") {
      throw new Error("You don't have edit access to this document");
    }

    // Ownership check only for owner; shared editors go through RLS
    const { error } = await supabase
      .from("documents")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", docId);

    if (error) throw new Error(error.message);

    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ─────────────────────────────────────────────────────────────
// RENAME DOCUMENT
// ─────────────────────────────────────────────────────────────

export async function renameDocument(
  docId: string,
  title: string
): Promise<ActionResult> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { ok: false, error: "Title cannot be empty" };
    if (trimmed.length > 255) return { ok: false, error: "Title too long" };

    const { supabase, user } = await getAuthenticatedUser();
    await assertOwner(supabase, docId, user.id);

    const { error } = await supabase
      .from("documents")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", docId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ─────────────────────────────────────────────────────────────
// DELETE DOCUMENT
// ─────────────────────────────────────────────────────────────

export async function deleteDocument(
  docId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    await assertOwner(supabase, docId, user.id);

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", docId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ─────────────────────────────────────────────────────────────
// FETCH DOCUMENTS (owned + shared, for dashboard)
// ─────────────────────────────────────────────────────────────

export async function fetchMyDocuments() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from("documents")
      .select("id, title, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { ok: true as const, data: data ?? [] };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message, data: [] };
  }
}

export async function fetchSharedWithMe() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from("document_shares")
      .select(`
        permission,
        documents (
          id, title, updated_at,
          profiles ( email, display_name )
        )
      `)
      .eq("shared_with", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { ok: true as const, data: data ?? [] };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message, data: [] };
  }
}
