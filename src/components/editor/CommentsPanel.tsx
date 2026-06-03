"use client";

import { useState, useEffect, useTransition } from "react";
import {
  addComment,
  resolveComment,
  deleteComment,
  getComments,
} from "@/lib/actions/comments";
import { DocumentComment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCheck, Trash2, Send, Loader2, MessageSquare } from "lucide-react";

interface Props {
  docId: string;
  currentUserId: string;
  open: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommentsPanel({ docId, currentUserId, open }: Props) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    loadComments();
  }, [open, docId]);

  function loadComments() {
    startTransition(async () => {
      const result = await getComments(docId);
      if (result.ok) setComments(result.data);
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!body.trim()) return;

    startTransition(async () => {
      const result = await addComment(docId, body);
      if (!result.ok) { setError(result.error); return; }
      setBody("");
      loadComments();
    });
  }

  function handleResolve(comment: DocumentComment) {
    startTransition(async () => {
      await resolveComment(comment.id, docId, !comment.resolved);
      loadComments();
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, docId);
      loadComments();
    });
  }

  const open_    = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div
      className={cn(
        "flex flex-col border-l bg-background w-80 shrink-0 transition-all duration-200",
        open ? "translate-x-0 opacity-100" : "w-0 opacity-0 overflow-hidden pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Comments</span>
        {open_.length > 0 && (
          <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
            {open_.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {comments.length === 0 && !isPending && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No comments yet.
          </p>
        )}

        {open_.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            isMine={c.author_id === currentUserId}
            onResolve={() => handleResolve(c)}
            onDelete={() => handleDelete(c.id)}
            disabled={isPending}
          />
        ))}

        {resolved.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground pt-2 pb-1 font-medium">Resolved</p>
            {resolved.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                isMine={c.author_id === currentUserId}
                onResolve={() => handleResolve(c)}
                onDelete={() => handleDelete(c.id)}
                disabled={isPending}
              />
            ))}
          </>
        )}
      </div>

      {/* Add comment form */}
      <div className="border-t px-3 py-3 shrink-0">
        <form onSubmit={handleAdd} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(e as unknown as React.FormEvent);
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={isPending || !body.trim()}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Comment
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Single comment card ───────────────────────────────────────
interface CardProps {
  comment: DocumentComment;
  isMine: boolean;
  onResolve: () => void;
  onDelete: () => void;
  disabled: boolean;
}

function CommentCard({ comment, isMine, onResolve, onDelete, disabled }: CardProps) {
  const email = comment.profiles?.email ?? "Unknown";
  const name  = comment.profiles?.display_name ?? email.split("@")[0];

  return (
    <div className={cn(
      "rounded-lg border p-3 text-sm space-y-1.5",
      comment.resolved && "opacity-50"
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate text-xs">{name}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
      <div className="flex items-center gap-1 pt-0.5">
        <button
          onClick={onResolve}
          disabled={disabled}
          title={comment.resolved ? "Reopen" : "Resolve"}
          className={cn(
            "p-1 rounded hover:bg-accent transition-colors disabled:opacity-40",
            comment.resolved ? "text-muted-foreground" : "text-emerald-600"
          )}
        >
          <CheckCheck className="h-3.5 w-3.5" />
        </button>
        {isMine && (
          <button
            onClick={onDelete}
            disabled={disabled}
            title="Delete"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
