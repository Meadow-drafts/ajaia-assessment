import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DocList from "@/components/docs/DocList";
import { DocumentWithPermission } from "@/lib/types";

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

  // Documents shared with me — join to documents via document_shares
  const { data: sharedRows } = await supabase
    .from("document_shares")
    .select("permission, documents(id, title, updated_at, created_at, owner_id, content)")
    .eq("shared_with", user.id)
    .order("created_at", { ascending: false });

  const sharedDocs: DocumentWithPermission[] = (sharedRows ?? []).flatMap((row) => {
    const document = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    if (!document) return [];

    return [
      {
        id: document.id,
        owner_id: document.owner_id,
        title: document.title,
        content: document.content,
        created_at: document.created_at,
        updated_at: document.updated_at,
        permission: row.permission as "view" | "edit",
      },
    ];
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, and share your documents.
        </p>
      </header>

      <DocList ownedDocs={ownedDocs ?? []} sharedDocs={sharedDocs} />
    </div>
  );
}
