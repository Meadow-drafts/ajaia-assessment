"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { renameDocument, deleteDocument } from "@/lib/actions/documents";
import { DocumentWithPermission } from "@/lib/types";
import { downloadMarkdown } from "@/lib/export";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ShareDialog from "@/components/docs/ShareDialog";
import { cn } from "@/lib/utils";
import {
  FileText, MoreHorizontal, Eye, Download,
  Pencil, Share2, Trash2, User,
} from "lucide-react";

interface Props {
  doc: DocumentWithPermission;
  isOwner: boolean;
  selected: boolean;
  onSelect: () => void;
  onMutationStart?: () => void;
  onMutationEnd?: () => void;
  onRefresh?: () => void;
}

export default function DocRow({
  doc, isOwner, selected, onSelect,
  onMutationStart, onMutationEnd, onRefresh,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formattedDate = new Date(doc.updated_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  function handleRename() {
    if (!title.trim()) { setTitle(doc.title); setRenaming(false); return; }
    if (title === doc.title) { setRenaming(false); return; }
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

  function stop(e: React.MouseEvent) { e.stopPropagation(); }

  return (
    <>
      <div
        onClick={onSelect}
        className={cn(
          "group flex items-center px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors",
          selected && "bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-primary",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        {/* File icon */}
        <FileText className="h-4 w-4 text-blue-500 shrink-0 mr-3" />

        {/* Name column */}
        <div className="flex-1 min-w-0 mr-4" onClick={stop}>
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
              className="h-7 text-sm max-w-xs"
            />
          ) : (
            <span
              className="text-sm font-medium truncate block"
              onDoubleClick={() => isOwner && setRenaming(true)}
              title={isOwner ? "Double-click to rename" : undefined}
            >
              {doc.title}
            </span>
          )}
        </div>

        {/* Sharing column — shared docs only */}
        {!isOwner && (
          <div className="w-40 shrink-0 hidden sm:flex items-center gap-1.5">
            {doc.permission && (
              <Badge variant="outline" className="text-xs">
                {doc.permission === "edit" ? "Can edit" : "View only"}
              </Badge>
            )}
            {(doc.owner_display_name ?? doc.owner_email) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[110px]">
                  {doc.owner_display_name ?? doc.owner_email!.split("@")[0]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Last updated column */}
        <div className="w-32 shrink-0 text-xs text-muted-foreground hidden md:block">
          {formattedDate}
        </div>

        {/* ⋮ menu */}
        <div className="w-8 shrink-0 flex justify-end relative" onClick={stop}>
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
              <div className="absolute right-0 top-8 z-20 w-44 rounded-md border bg-background shadow-lg py-1 text-sm">
                <Link
                  href={`/doc/${doc.id}`}
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent"
                  onClick={() => setMenuOpen(false)}
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
                <button
                  onClick={() => { downloadMarkdown(doc.title, doc.content); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent w-full text-left"
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </button>

                {isOwner && (
                  <>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => { setRenaming(true); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent text-left"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </button>
                    <button
                      onClick={() => { setShareOpen(true); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent text-left"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => { handleDelete(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent text-destructive text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isOwner && (
        <ShareDialog docId={doc.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </>
  );
}
