import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import DocEditor from "@/components/editor/DocEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!doc) notFound();

  // Check access: owner or shared
  const isOwner = doc.owner_id === user.id;

  let canEdit = isOwner;
  if (!isOwner) {
    const { data: share } = await supabase
      .from("document_shares")
      .select("permission")
      .eq("doc_id", id)
      .eq("shared_with", user.id)
      .single();

    if (!share) notFound();
    canEdit = share.permission === "edit";
  }

  return <DocEditor doc={doc} canEdit={canEdit} isOwner={isOwner} />;
}
