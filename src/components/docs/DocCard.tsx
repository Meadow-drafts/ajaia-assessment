"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { renameDocument, deleteDocument } from "@/lib/actions/documents";
import { DocumentWithPermission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Props {
  doc: DocumentWithPermission;
  isOwner: boolean;
}

export default function DocCard({ doc, isOwner }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [isPending, startTransition] = useTransition();

  const formattedDate = new Date(doc.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleRename() {
    if (!title.trim()) { setRenaming(false); return; }
    startTransition(async () => {
      const result = await renameDocument(doc.id, title);
      setRenaming(false);
      if (result.ok) router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (result.ok) router.refresh();
    });
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
    </div>
  );
}
