"use client";

import { useState, useEffect, useTransition } from "react";
import { shareDocument, revokeShare, getDocumentShares } from "@/lib/actions/shares";
import { ShareWithProfile } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Loader2 } from "lucide-react";

interface Props {
  docId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ docId, open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [shares, setShares] = useState<ShareWithProfile[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    loadShares();
  }, [open]);

  function loadShares() {
    startTransition(async () => {
      const result = await getDocumentShares(docId);
      if (result.ok) setShares(result.data);
    });
  }

  function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await shareDocument(docId, email, permission);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      loadShares();
    });
  }

  function handleRevoke(shareId: string) {
    startTransition(async () => {
      await revokeShare(shareId, docId);
      loadShares();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Invite people to view or edit this document.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <form onSubmit={handleShare} className="flex gap-2 mt-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="flex-1"
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "view" | "edit")}
            className="rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
          <Button type="submit" size="icon" disabled={isPending} aria-label="Share">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Current shares */}
        {shares.length > 0 && (
          <ul className="mt-2 divide-y rounded-md border">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate text-muted-foreground">
                  {share.profiles?.email ?? share.shared_with}
                </span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant="outline">{share.permission}</Badge>
                  <button
                    onClick={() => handleRevoke(share.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {shares.length === 0 && !isPending && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Not shared with anyone yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
