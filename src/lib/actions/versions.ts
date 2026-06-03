"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DocumentVersion } from "@/lib/types";
import { attachProfilesById, type ProfileRecord } from "@/lib/profile-lookup";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Save a version snapshot ───────────────────────────────────
export async function saveVersion(
  docId: string,
  content: object,
  label?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("document_versions")
      .insert({ doc_id: docId, saved_by: user.id, content, label: label ?? null })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to save version");

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── List versions for a document ─────────────────────────────
export async function getVersions(
  docId: string
): Promise<ActionResult<DocumentVersion[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("doc_id", docId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const savedByIds = Array.from(new Set((data ?? []).map((version) => version.saved_by)));
    const { data: profiles } = savedByIds.length
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", savedByIds)
      : { data: [] as ProfileRecord[] };

    return {
      ok: true,
      data: attachProfilesById((data ?? []) as DocumentVersion[], "saved_by", profiles ?? []) as unknown as DocumentVersion[],
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Restore a version (writes it as current document content) ─
export async function restoreVersion(
  docId: string,
  versionId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch the version content
    const { data: version, error: fetchErr } = await supabase
      .from("document_versions")
      .select("content")
      .eq("id", versionId)
      .eq("doc_id", docId)
      .single();

    if (fetchErr || !version) throw new Error("Version not found");

    // Save current state as a version before restoring (so you don't lose work)
    const { data: current } = await supabase
      .from("documents")
      .select("content")
      .eq("id", docId)
      .single();

    if (current?.content) {
      await supabase.from("document_versions").insert({
        doc_id: docId,
        saved_by: user.id,
        content: current.content,
        label: "Auto-saved before restore",
      });
    }

    // Apply the restored content
    const { error: updateErr } = await supabase
      .from("documents")
      .update({ content: version.content, updated_at: new Date().toISOString() })
      .eq("id", docId);

    if (updateErr) throw new Error(updateErr.message);

    revalidatePath(`/doc/${docId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
