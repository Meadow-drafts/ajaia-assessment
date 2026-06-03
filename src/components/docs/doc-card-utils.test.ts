import { describe, it, expect } from "vitest";
import { getDocumentOwnerLabel } from "./doc-card-utils";

describe("getDocumentOwnerLabel", () => {
  it("prefers the owner's display name", () => {
    expect(
      getDocumentOwnerLabel({
        owner_display_name: "Ada Lovelace",
        owner_email: "ada@example.com",
      })
    ).toBe("Ada Lovelace");
  });

  it("falls back to the owner's email address", () => {
    expect(
      getDocumentOwnerLabel({
        owner_display_name: null,
        owner_email: "ada@example.com",
      })
    ).toBe("ada@example.com");
  });
});
