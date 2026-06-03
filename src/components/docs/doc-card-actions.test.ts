import { describe, it, expect } from "vitest";
import { getDocumentCardActions } from "./doc-card-actions";

describe("getDocumentCardActions", () => {
  it("shows share only for owner cards", () => {
    expect(getDocumentCardActions(true)).toEqual({
      showShare: true,
      showExport: true,
    });

    expect(getDocumentCardActions(false)).toEqual({
      showShare: false,
      showExport: true,
    });
  });
});
