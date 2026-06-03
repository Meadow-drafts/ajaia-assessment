"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Document } from "@/lib/types";
import { updateDocumentContent, renameDocument } from "@/lib/actions/documents";
import Editor from "./Editor";
import ShareDialog from "@/components/docs/ShareDialog";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  doc: Document;
  canEdit: boolean;
  isOwner: boolean;
}

const AUTOSAVE_DELAY = 800;

export default function DocEditor({ doc, canEdit, isOwner }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [shareOpen, setShareOpen] = useState(false);
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback(
    (content: object) => {
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);

      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          const result = await updateDocumentContent(doc.id, content);
          setSaveState(result.ok ? "saved" : "error");
        });
      }, AUTOSAVE_DELAY);
    },
    [doc.id]
  );

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (!value || value === doc.title) return;

    startTransition(async () => {
      await renameDocument(doc.id, value);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <input
          className="flex-1 min-w-0 text-lg font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground disabled:opacity-60"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={!canEdit}
          placeholder="Untitled"
          aria-label="Document title"
        />

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Save indicator */}
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving</>}
            {saveState === "saved"  && <><Check  className="h-3 w-3 text-green-500" /> Saved</>}
            {saveState === "error"  && <span className="text-destructive">Save failed</span>}
          </span>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}

          {!isOwner && (
            <span className="text-xs text-muted-foreground border rounded px-2 py-1">
              {canEdit ? "Can edit" : "View only"}
            </span>
          )}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          content={doc.content}
          onChange={handleContentChange}
          editable={canEdit}
        />
      </div>

      {isOwner && (
        <ShareDialog docId={doc.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </div>
  );
}
