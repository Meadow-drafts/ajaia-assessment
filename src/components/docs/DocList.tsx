"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/lib/actions/documents";
import { DocumentWithPermission } from "@/lib/types";
import DocCard from "./DocCard";
import UploadButton from "./UploadButton";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Share2 } from "lucide-react";

interface Props {
  ownedDocs: DocumentWithPermission[];
  sharedDocs: DocumentWithPermission[];
}

export default function DocList({ ownedDocs, sharedDocs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      await createDocument();
      router.refresh();
    });
  }

  const empty = ownedDocs.length === 0 && sharedDocs.length === 0;

  return (
    <div className="space-y-8">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCreate} disabled={isPending}>
          <Plus className="h-4 w-4" />
          New document
        </Button>
        <UploadButton />
      </div>

      {/* Empty state */}
      {empty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a document or upload a .txt / .md file to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {ownedDocs.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                My documents
              </h2>
              <div className="space-y-1">
                {ownedDocs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} isOwner />
                ))}
              </div>
            </section>
          )}

          {sharedDocs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Shared with me
                </h2>
              </div>
              <div className="space-y-1">
                {sharedDocs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} isOwner={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
