import type { DocumentWithPermission, Permission } from "@/lib/types";

type SharedDocumentRow = {
  permission: Permission;
  documents:
    | {
        id: string;
        owner_id: string;
        title: string;
        content: object | null;
        created_at: string;
        updated_at: string;
      }
    | {
        id: string;
        owner_id: string;
        title: string;
        content: object | null;
        created_at: string;
        updated_at: string;
      }[]
    | null;
};

type OwnerProfile = {
  id: string;
  email: string;
  display_name: string | null;
};

export function buildSharedDocuments(
  sharedRows: SharedDocumentRow[],
  ownerProfiles: OwnerProfile[]
): DocumentWithPermission[] {
  const profilesById = new Map(ownerProfiles.map((profile) => [profile.id, profile]));

  return sharedRows.flatMap((row) => {
    const document = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    if (!document) return [];

    const profile = profilesById.get(document.owner_id);

    return [
      {
        id: document.id,
        owner_id: document.owner_id,
        title: document.title,
        content: document.content,
        created_at: document.created_at,
        updated_at: document.updated_at,
        permission: row.permission,
        owner_email: profile?.email ?? null,
        owner_display_name: profile?.display_name ?? null,
      },
    ];
  });
}
