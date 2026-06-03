import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DocList from "@/components/docs/DocList";
import { DocumentWithPermission } from "@/lib/types";
import { buildSharedDocuments } from "@/lib/shared-docs";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Owned documents
  const { data: ownedDocs } = await supabase
    .from("documents")
    .select("id, title, created_at, updated_at, owner_id, content")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  // Documents shared with me
  const { data: sharedRows } = await supabase
    .from("document_shares")
    .select("permission, documents(id, title, updated_at, created_at, owner_id, content)")
    .eq("shared_with", user.id)
    .order("created_at", { ascending: false });

  const ownerIds = Array.from(
    new Set(
      (sharedRows ?? []).flatMap((row) => {
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

  const sharedDocs: DocumentWithPermission[] = buildSharedDocuments(
    sharedRows ?? [],
    ownerProfiles ?? []
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, and share your documents.
        </p>
      </header>

      <DocList
        ownedDocs={ownedDocs ?? []}
        sharedDocs={sharedDocs}
        currentUserId={user.id}
      />
    </div>
  );
}
