export type Permission = "view" | "edit";

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  content: object | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentShare {
  id: string;
  doc_id: string;
  shared_with: string;
  shared_by: string;
  permission: Permission;
  created_at: string;
}

export interface ShareWithProfile extends DocumentShare {
  profiles?: { email: string; display_name: string | null };
}

export interface DocumentWithPermission extends Document {
  permission?: Permission;
}
