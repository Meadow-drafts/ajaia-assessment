"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ShareWithProfile } from "@/lib/types";
import { buildSharedDocuments } from "@/lib/shared-docs";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };


// ── Share a document with a user by email ────────────────────
export async function shareDocument(
  docId: string,
  email: string,
  permission: "view" | "edit"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Confirm caller owns the document
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", docId)
      .eq("owner_id", user.id)
      .single();

    if (!doc) throw new Error("Document not found or you are not the owner");

    // Resolve email → user_id via RPC (security definer, reads auth.users)
    const { data: targetUserId, error: lookupError } = await supabase
      .rpc("get_user_id_by_email", { email_input: email.trim().toLowerCase() });

    if (lookupError || !targetUserId) {
      throw new Error("No account found with that email address");
    }

    if (targetUserId === user.id) {
      throw new Error("You can't share a document with yourself");
    }

    // Upsert so re-sharing updates the permission level
    const { error } = await supabase.from("document_shares").upsert(
      { doc_id: docId, shared_with: targetUserId, shared_by: user.id, permission },
      { onConflict: "doc_id,shared_with" }
    );

    if (error) throw new Error(error.message);

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ── Revoke a share ───────────────────────────────────────────
export async function revokeShare(
  shareId: string,
  docId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // RLS (shares_owner policy) enforces ownership — this will no-op if not owner
    const { error } = await supabase
      .from("document_shares")
      .delete()
      .eq("id", shareId);

    if (error) throw new Error(error.message);

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ── List all shares for a document (owner view) ──────────────
export async function getDocumentShares(
  docId: string
): Promise<ActionResult<ShareWithProfile[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch shares without join (shared_with → auth.users, not profiles directly)
    const { data: sharesData, error } = await supabase
      .from("document_shares")
      .select("*")
      .eq("doc_id", docId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    if (!sharesData?.length) return { ok: true, data: [] };

    // Fetch profiles separately then merge
    const userIds = sharesData.map((s) => s.shared_with);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

    const merged: ShareWithProfile[] = sharesData.map((s) => ({
      ...s,
      profiles: profileMap.get(s.shared_with) ?? null,
    }));

    return { ok: true, data: merged };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}


// ── Fetch documents shared with the current user ─────────────
export async function getSharedWithMe() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: true as const, data: [] };

    const { data, error } = await supabase
      .from("document_shares")
      .select(`
        permission,
        documents (
          id, title, updated_at, created_at, owner_id, content
        )
      `)
      .eq("shared_with", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const ownerIds = Array.from(
      new Set(
        (data ?? []).flatMap((row) => {
          const document = Array.isArray(row.documents) ? row.documents[0] : row.documents;
          return document ? [document.owner_id] : [];
        })
      )
    );

    const { data: ownerProfiles } = ownerIds.length
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", ownerIds)
      : { data: [] };

    const docs = buildSharedDocuments(data ?? [], ownerProfiles ?? []);

    return { ok: true as const, data: docs };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message, data: [] };
  }
}
