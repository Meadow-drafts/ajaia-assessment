"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { renameDocument, deleteDocument } from "@/lib/actions/documents";
import { DocumentWithPermission } from "@/lib/types";
import { downloadMarkdown } from "@/lib/export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShareDialog from "@/components/docs/ShareDialog";
import { Download, MoreHorizontal, Pencil, Share2, Trash2, User } from "lucide-react";
import { getDocumentOwnerLabel } from "./doc-card-utils";
import { getDocumentCardActions } from "./doc-card-actions";

interface Props {
  doc: DocumentWithPermission;
  isOwner: boolean;
  onMutationStart?: () => void;
  onMutationEnd?: () => void;
  onRefresh?: () => void;
}

export default function DocCard({
  doc,
  isOwner,
  onMutationStart,
  onMutationEnd,
  onRefresh,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ownerLabel = !isOwner ? getDocumentOwnerLabel(doc) : null;
  const { showShare, showExport } = getDocumentCardActions(isOwner);

  const formattedDate = new Date(doc.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleRename() {
    if (!title.trim()) { setRenaming(false); return; }
    onMutationStart?.();
    startTransition(async () => {
      try {
        const result = await renameDocument(doc.id, title);
        setRenaming(false);
        if (result.ok) onRefresh?.();
      } finally {
        onMutationEnd?.();
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    onMutationStart?.();
    startTransition(async () => {
      try {
        const result = await deleteDocument(doc.id);
        if (result.ok) onRefresh?.();
      } finally {
        onMutationEnd?.();
      }
    });
  }

  function handleExport() {
    downloadMarkdown(title.trim() || doc.title, doc.content);
  }

  return (
    <div className="group flex items-center justify-between px-4 py-3 rounded-lg border bg-background hover:bg-accent/40 transition-colors">
      {/* Title + meta */}
      <div className="flex-1 min-w-0 mr-2">
        {renaming ? (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setTitle(doc.title); setRenaming(false); }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <Link href={`/doc/${doc.id}`} className="block">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formattedDate}
            </p>
            {!isOwner && ownerLabel && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{ownerLabel}</span>
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Right side: permission badge + menu */}
      <div className="flex items-center gap-2 shrink-0">
        {!isOwner && doc.permission && (
          <Badge variant="outline" className="text-xs">
            {doc.permission === "edit" ? "Can edit" : "View only"}
          </Badge>
        )}

        {showExport && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            className="h-8 w-8"
            aria-label="Export document"
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {showShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="h-8"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}

        {isOwner && !renaming && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={isPending}
              className="p-1.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
              aria-label="Document options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-36 rounded-md border bg-background shadow-md py-1">
                  <button
                    onClick={() => { setRenaming(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </button>
                  <button
                    onClick={() => { handleDelete(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showShare && (
        <ShareDialog docId={doc.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </div>
  );
}
