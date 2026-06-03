"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Document } from "@/lib/types";
import { updateDocumentContent, renameDocument } from "@/lib/actions/documents";
import { saveVersion } from "@/lib/actions/versions";
import { downloadMarkdown } from "@/lib/export";
import Editor from "./Editor";
import CollaborationBar from "./CollaborationBar";
import CommentsPanel from "./CommentsPanel";
import ShareDialog from "@/components/docs/ShareDialog";
import VersionHistory from "./VersionHistory";
import { Button } from "@/components/ui/button";
import {
  Share2, Check, Loader2, ArrowLeft,
  Download, MessageSquare, History, BookmarkPlus,
} from "lucide-react";
import Link from "next/link";

interface Props {
  doc: Document;
  canEdit: boolean;
  isOwner: boolean;
  currentUser: { id: string; email: string };
}

const AUTOSAVE_DELAY = 800;

export default function DocEditor({ doc, canEdit, isOwner, currentUser }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  // Panel / modal visibility
  const [shareOpen,      setShareOpen]      = useState(false);
  const [commentsOpen,   setCommentsOpen]   = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);

  const [, startTransition] = useTransition();
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<object | null>(doc.content);

  // ── Content auto-save ───────────────────────────────────────
  const handleContentChange = useCallback(
    (content: object) => {
      contentRef.current = content;
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

  // ── Title rename ────────────────────────────────────────────
  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    if (!value || value === doc.title) return;
    startTransition(async () => {
      await renameDocument(doc.id, value);
      router.refresh();
    });
  }

  // ── Save version ────────────────────────────────────────────
  function handleSaveVersion() {
    if (!contentRef.current) return;
    const label = window.prompt("Version label (optional):")?.trim() || undefined;
    startTransition(async () => {
      await saveVersion(doc.id, contentRef.current!, label);
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b shrink-0 bg-background">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" aria-label="Back">
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

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Who else is here */}
            <CollaborationBar docId={doc.id} currentUser={currentUser} />

            {/* Save indicator */}
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 w-16 justify-end">
              {saveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" />Saving</>}
              {saveState === "saved"  && <><Check   className="h-3 w-3 text-green-500" />Saved</>}
              {saveState === "error"  && <span className="text-destructive text-xs">Error</span>}
            </span>

            {/* Export */}
            <Button variant="ghost" size="sm" onClick={() => downloadMarkdown(title, contentRef.current)} title="Export as Markdown">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Save version */}
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={handleSaveVersion} title="Save version snapshot">
                <BookmarkPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Save version</span>
              </Button>
            )}

            {/* Version history */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              title="Version history"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>

            {/* Comments toggle */}
            <Button
              variant={commentsOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCommentsOpen((v) => !v)}
              title="Toggle comments"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Comments</span>
            </Button>

            {/* Share */}
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}

            {!isOwner && (
              <span className="text-xs text-muted-foreground border rounded px-2 py-1 hidden sm:block">
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
      </div>

      {/* Comments side panel */}
      <CommentsPanel
        docId={doc.id}
        currentUserId={currentUser.id}
        open={commentsOpen}
      />

      {/* Modals */}
      {isOwner && (
        <ShareDialog docId={doc.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
      <VersionHistory docId={doc.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
