"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CollaboratorPresence } from "@/lib/types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getOnlineCollaborators } from "./collaboration-utils";

interface Props {
  docId: string;
  currentUser: { id: string; email: string };
}

function initials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

// Deterministic colour from email string
function avatarColor(email: string): string {
  const colors = [
    "bg-blue-500", "bg-violet-500", "bg-rose-500",
    "bg-amber-500", "bg-emerald-500", "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export default function CollaborationBar({ docId, currentUser }: Props) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const initializePresence = async () => {
      await supabase.removeAllChannels();
      if (cancelled) return;

      channel = supabase.channel(`doc-presence:${docId}`, {
        config: { presence: { key: currentUser.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState<CollaboratorPresence>() ?? {};
          setCollaborators(getOnlineCollaborators(state, currentUser.id));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && channel) {
            await channel.track({
              user_id: currentUser.id,
              email: currentUser.email,
              online_at: Date.now(),
            });
          }
        });

      channelRef.current = channel;
    };

    void initializePresence();

    return () => {
      cancelled = true;
      if (channel) {
        const activeChannel = channel;
        activeChannel.untrack().then(() => supabase.removeChannel(activeChannel));
      }
      channelRef.current = null;
    };
  }, [docId, currentUser.id, currentUser.email]);

  if (collaborators.length === 0) return null;

  const visible  = collaborators.slice(0, 4);
  const overflow = collaborators.length - visible.length;

  return (
    <div className="flex items-center gap-1" title="Also viewing this document">
      {visible.map((c) => (
        <div
          key={c.user_id}
          title={c.email}
          className={`h-7 w-7 rounded-full ${avatarColor(c.email)} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background`}
        >
          {initials(c.email)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold ring-2 ring-background">
          +{overflow}
        </div>
      )}
    </div>
  );
}
