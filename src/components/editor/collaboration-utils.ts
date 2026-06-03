import type { CollaboratorPresence } from "@/lib/types";

type PresenceState = Record<string, CollaboratorPresence[]>;

export function getOnlineCollaborators(
  state: PresenceState,
  currentUserId: string
): CollaboratorPresence[] {
  return Object.values(state)
    .flat()
    .filter((presence) => presence.user_id !== currentUserId);
}
