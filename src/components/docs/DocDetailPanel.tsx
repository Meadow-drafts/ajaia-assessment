"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { DocumentWithPermission, ShareWithProfile, DocumentComment, DocumentVersion } from "@/lib/types";
import { getDocumentShares } from "@/lib/actions/shares";
import { getComments, addComment } from "@/lib/actions/comments";
import { getVersions } from "@/lib/actions/versions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X, Users, MessageSquare, History,
  ExternalLink, Loader2, Send, User,
} from "lucide-react";

interface Props {
  doc: DocumentWithPermission;
  isOwner: boolean;
  onClose: () => void;
  onManageShare: () => void;
}

type Tab = "sharing" | "comments" | "history";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "sharing",  label: "Sharing",  icon: <Users         className="h-3.5 w-3.5" /> },
  { id: "comments", label: "Comments", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "history",  label: "History",  icon: <History       className="h-3.5 w-3.5" /> },
];

export default function DocDetailPanel({ doc, isOwner, onClose, onManageShare }: Props) {
  const [tab, setTab] = useState<Tab>("sharing");
  const [shares,   setShares]   = useState<ShareWithProfile[]>([]);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset everything when the selected document changes
  useEffect(() => {
    setTab("sharing");
    setShares([]);
    setComments([]);
    setVersions([]);
    setBody("");
  }, [doc.id]);

  // Load data when tab changes
  useEffect(() => {
    if (tab === "sharing" && isOwner) {
      startTransition(async () => {
        const r = await getDocumentShares(doc.id);
        if (r.ok) setShares(r.data);
      });
    }
  }, [tab, doc.id, isOwner]);

  useEffect(() => {
    if (tab === "comments") {
      startTransition(async () => {
        const r = await getComments(doc.id);
        if (r.ok) setComments(r.data);
      });
    }
  }, [tab, doc.id]);

  useEffect(() => {
    if (tab === "history") {
      startTransition(async () => {
        const r = await getVersions(doc.id);
        if (r.ok) setVersions(r.data);
      });
    }
  }, [tab, doc.id]);

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addComment(doc.id, body);
      if (r.ok) {
        setBody("");
        const refreshed = await getComments(doc.id);
        if (refreshed.ok) setComments(refreshed.data);
      }
    });
  }

  const openComments     = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) =>  c.resolved);

  return (
    <div className="flex flex-col border-l bg-background w-80 shrink-0 overflow-hidden">

      {/* Panel header */}
      <div className="flex items-start justify-between px-4 py-3 border-b shrink-0 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{doc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modified {formatDate(doc.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/doc/${doc.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open document">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 flex-1 justify-center px-2 py-2.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Sharing tab ── */}
        {tab === "sharing" && (
          <div className="p-4 space-y-4">
            {isPending ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isOwner ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    People with access
                  </p>
                  <button
                    onClick={onManageShare}
                    className="text-xs text-primary hover:underline"
                  >
                    Manage
                  </button>
                </div>

                {/* You (owner) */}
                <PersonRow initial="Y" name="You (owner)" sub="Owner" color="bg-primary text-primary-foreground" />

                {shares.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Not shared with anyone yet.
                  </p>
                ) : (
                  shares.map((s) => {
                    const name = s.profiles?.display_name ?? s.profiles?.email ?? "Unknown";
                    return (
                      <PersonRow
                        key={s.id}
                        initial={name.charAt(0).toUpperCase()}
                        name={name}
                        sub={s.permission === "edit" ? "Can edit" : "View only"}
                      />
                    );
                  })
                )}

                <Button variant="outline" size="sm" className="w-full" onClick={onManageShare}>
                  <Users className="h-3.5 w-3.5" />
                  Share document
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Shared with you
                </p>
                {(doc.owner_display_name ?? doc.owner_email) && (
                  <PersonRow
                    initial={(doc.owner_display_name ?? doc.owner_email ?? "?").charAt(0).toUpperCase()}
                    name={doc.owner_display_name ?? doc.owner_email ?? "Unknown"}
                    sub="Owner"
                  />
                )}
                {doc.permission && (
                  <p className="text-xs text-muted-foreground">
                    Your access:{" "}
                    <span className="font-medium text-foreground">
                      {doc.permission === "edit" ? "Can edit" : "View only"}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Comments tab ── */}
        {tab === "comments" && (
          <div className="flex flex-col min-h-full">
            <div className="flex-1 p-4 space-y-3">
              {isPending && comments.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isPending && comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No comments yet.
                </p>
              )}

              {openComments.map((c) => (
                <CommentBubble key={c.id} comment={c} />
              ))}

              {resolvedComments.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-medium pt-1">Resolved</p>
                  {resolvedComments.map((c) => (
                    <CommentBubble key={c.id} comment={c} resolved />
                  ))}
                </>
              )}
            </div>

            <div className="border-t p-3 shrink-0">
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAddComment(e as unknown as React.FormEvent);
                    }
                  }}
                />
                <Button type="submit" size="sm" className="w-full" disabled={isPending || !body.trim()}>
                  {isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Send className="h-3 w-3" />}
                  Comment
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {tab === "history" && (
          <div className="p-4 space-y-2">
            {isPending && versions.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isPending && versions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No versions saved yet. Open the document and use "Save version".
              </p>
            )}

            {versions.map((v) => {
              const author = v.profiles?.display_name ?? v.profiles?.email ?? "Unknown";
              return (
                <div key={v.id} className="rounded-lg border px-3 py-2.5 space-y-0.5 hover:bg-accent/30 transition-colors">
                  <p className="text-xs font-medium">{v.label ?? formatDate(v.created_at)}</p>
                  {v.label && (
                    <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">by {author}</p>
                </div>
              );
            })}

            {versions.length > 0 && (
              <Link href={`/doc/${doc.id}`} className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open to restore a version
                </Button>
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Small sub-components ─────────────────────────────────────

interface PersonRowProps {
  initial: string;
  name: string;
  sub: string;
  color?: string;
}

function PersonRow({ initial, name, sub, color = "bg-muted text-foreground" }: PersonRowProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
        color,
      )}>
        {initial}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

interface CommentBubbleProps {
  comment: DocumentComment;
  resolved?: boolean;
}

function CommentBubble({ comment, resolved = false }: CommentBubbleProps) {
  const name = comment.profiles?.display_name
    ?? comment.profiles?.email?.split("@")[0]
    ?? "Unknown";

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-1",
      resolved && "opacity-50",
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate">{name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
    </div>
  );
}
