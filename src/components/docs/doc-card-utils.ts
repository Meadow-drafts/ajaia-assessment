import type { DocumentWithPermission } from "@/lib/types";

export function getDocumentOwnerLabel(
  doc: Pick<DocumentWithPermission, "owner_display_name" | "owner_email">
) {
  return doc.owner_display_name?.trim() || doc.owner_email?.trim() || null;
}
