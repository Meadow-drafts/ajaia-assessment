"use client";

import { useState, useEffect, useTransition } from "react";
import { getVersions, restoreVersion } from "@/lib/actions/versions";
import { DocumentVersion } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  docId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VersionHistory({ docId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await getVersions(docId);
      if (result.ok) setVersions(result.data);
    });
  }, [open, docId]);

  function handleRestore(versionId: string) {
    if (!confirm("Restore this version? Your current content will be auto-saved first.")) return;
    setRestoringId(versionId);

    startTransition(async () => {
      const result = await restoreVersion(docId, versionId);
      setRestoringId(null);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        alert(`Restore failed: ${result.error}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Version History
          </DialogTitle>
          <DialogDescription>
            Saved snapshots of this document. Restoring will save the current content first.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[420px] overflow-y-auto space-y-1 pr-1">
          {isPending && versions.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isPending && versions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              No versions saved yet. Use "Save version" in the editor to create one.
            </p>
          )}

          {versions.map((v) => {
            const isRestoring = restoringId === v.id;
            const author = v.profiles?.display_name ?? v.profiles?.email ?? "Unknown";

            return (
              <div
                key={v.id}
                className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {v.label ?? formatDate(v.created_at)}
                  </p>
                  {v.label && (
                    <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">by {author}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(v.id)}
                  disabled={isPending}
                  className="shrink-0"
                >
                  {isRestoring
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
