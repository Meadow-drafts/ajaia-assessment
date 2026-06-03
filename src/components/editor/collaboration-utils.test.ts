import { describe, it, expect } from "vitest";
import { getOnlineCollaborators } from "./collaboration-utils";

describe("getOnlineCollaborators", () => {
  it("filters out the current user from presence state", () => {
    const collaborators = getOnlineCollaborators(
      {
        user1: [{ user_id: "user1", email: "me@example.com", online_at: 1 }],
        user2: [{ user_id: "user2", email: "you@example.com", online_at: 2 }],
      },
      "user1"
    );

    expect(collaborators).toEqual([
      { user_id: "user2", email: "you@example.com", online_at: 2 },
    ]);
  });

  it("flattens all presence buckets", () => {
    const collaborators = getOnlineCollaborators(
      {
        user2: [
          { user_id: "user2", email: "you@example.com", online_at: 2 },
          { user_id: "user2", email: "you@example.com", online_at: 3 },
        ],
      },
      "user1"
    );

    expect(collaborators).toHaveLength(2);
  });
});
