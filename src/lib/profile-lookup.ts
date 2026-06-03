export type ProfileRecord = {
  id: string;
  email: string;
  display_name: string | null;
};

export function attachProfilesById<T extends object>(
  rows: T[],
  idField: string,
  profiles: ProfileRecord[]
): Array<T & { profiles?: ProfileRecord | null }> {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const recordId = String((row as Record<string, unknown>)[idField] ?? "");
    return {
      ...row,
      profiles: profilesById.get(recordId) ?? null,
    };
  });
}
