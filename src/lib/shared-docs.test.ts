import { describe, it, expect } from "vitest";
import { buildSharedDocuments } from "./shared-docs";

describe("buildSharedDocuments", () => {
  it("merges shared document rows with owner profiles", () => {
    const result = buildSharedDocuments(
      [
        {
          permission: "edit",
          documents: {
            id: "doc-1",
            owner_id: "owner-1",
            title: "Team Notes",
            content: { type: "doc" },
            created_at: "2026-06-01T10:00:00Z",
            updated_at: "2026-06-02T10:00:00Z",
          },
        },
      ],
      [
        {
          id: "owner-1",
          email: "ada@example.com",
          display_name: "Ada Lovelace",
        },
      ]
    );

    expect(result).toEqual([
      {
        id: "doc-1",
        owner_id: "owner-1",
        title: "Team Notes",
        content: { type: "doc" },
        created_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-02T10:00:00Z",
        permission: "edit",
        owner_email: "ada@example.com",
        owner_display_name: "Ada Lovelace",
      },
    ]);
  });

  it("skips rows that do not contain a document", () => {
    const result = buildSharedDocuments(
      [{ permission: "view", documents: null }],
      []
    );

    expect(result).toEqual([]);
  });
});
