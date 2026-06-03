"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DocumentComment } from "@/lib/types";
import { attachProfilesById, type ProfileRecord } from "@/lib/profile-lookup";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Add a comment ─────────────────────────────────────────────
export async function addComment(
  docId: string,
  body: string
): Promise<ActionResult<DocumentComment>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const trimmed = body.trim();
    if (!trimmed) throw new Error("Comment cannot be empty");

    const { data, error } = await supabase
      .from("document_comments")
      .insert({ doc_id: docId, author_id: user.id, body: trimmed })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to add comment");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", data.author_id)
      .single();

    revalidatePath(`/doc/${docId}`);
    return {
      ok: true,
      data: {
        ...(data as DocumentComment),
        profiles: profile ?? null,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Resolve / unresolve a comment ─────────────────────────────
export async function resolveComment(
  commentId: string,
  docId: string,
  resolved: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Only the doc owner or comment author can resolve
    const { error } = await supabase
      .from("document_comments")
      .update({ resolved })
      .eq("id", commentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Delete a comment (author only — enforced by RLS) ──────────
export async function deleteComment(
  commentId: string,
  docId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("document_comments")
      .delete()
      .eq("id", commentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Get all comments for a document ──────────────────────────
export async function getComments(
  docId: string
): Promise<ActionResult<DocumentComment[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("document_comments")
      .select("*")
      .eq("doc_id", docId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const authorIds = Array.from(new Set((data ?? []).map((comment) => comment.author_id)));
    const { data: profiles } = authorIds.length
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", authorIds)
      : { data: [] as ProfileRecord[] };

    return {
      ok: true,
      data: attachProfilesById((data ?? []) as DocumentComment[], "author_id", profiles ?? []) as unknown as DocumentComment[],
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
