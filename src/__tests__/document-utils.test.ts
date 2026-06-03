import { describe, it, expect } from "vitest";
import {
  textToTiptap,
  validateUploadedFile,
  titleFromFilename,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/document-utils";

// ─────────────────────────────────────────────────────────────
// textToTiptap
// ─────────────────────────────────────────────────────────────
describe("textToTiptap", () => {
  it("wraps each line in a paragraph node", () => {
    const result = textToTiptap("Hello\nWorld") as any;

    expect(result.type).toBe("doc");
    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Hello" }],
    });
    expect(result.content[1]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "World" }],
    });
  });

  it("produces an empty paragraph for blank lines (preserves spacing)", () => {
    const result = textToTiptap("First\n\nSecond") as any;

    expect(result.content).toHaveLength(3);
    // Middle line is blank — should be an empty paragraph with no content array
    expect(result.content[1]).toEqual({ type: "paragraph" });
  });

  it("returns a valid TipTap doc for empty input", () => {
    const result = textToTiptap("") as any;

    expect(result.type).toBe("doc");
    // Single empty paragraph for the empty string
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({ type: "paragraph" });
  });

  it("preserves leading/trailing whitespace within a line", () => {
    const result = textToTiptap("  indented") as any;

    expect(result.content[0].content[0].text).toBe("  indented");
  });
});

// ─────────────────────────────────────────────────────────────
// validateUploadedFile
// ─────────────────────────────────────────────────────────────
describe("validateUploadedFile", () => {
  const validTxt = { name: "notes.txt", type: "text/plain", size: 100 };
  const validMd  = { name: "readme.md", type: "text/markdown", size: 200 };

  it("accepts a valid .txt file", () => {
    expect(validateUploadedFile(validTxt)).toBeNull();
  });

  it("accepts a valid .md file", () => {
    expect(validateUploadedFile(validMd)).toBeNull();
  });

  it("rejects an unsupported extension", () => {
    expect(
      validateUploadedFile({ name: "data.csv", type: "text/csv", size: 100 })
    ).toBe("INVALID_EXTENSION");
  });

  it("rejects an unsupported MIME type when extension is .txt but MIME is wrong", () => {
    expect(
      validateUploadedFile({ name: "file.txt", type: "application/octet-stream", size: 100 })
    ).toBe("INVALID_MIME");
  });

  it("allows empty MIME type (some browsers omit it)", () => {
    expect(
      validateUploadedFile({ name: "notes.txt", type: "", size: 100 })
    ).toBeNull();
  });

  it("rejects a file exceeding the size limit", () => {
    expect(
      validateUploadedFile({ name: "huge.txt", type: "text/plain", size: MAX_FILE_SIZE_BYTES + 1 })
    ).toBe("FILE_TOO_LARGE");
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateUploadedFile({ name: "edge.txt", type: "text/plain", size: MAX_FILE_SIZE_BYTES })
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// titleFromFilename
// ─────────────────────────────────────────────────────────────
describe("titleFromFilename", () => {
  it("strips the .txt extension", () => {
    expect(titleFromFilename("my-notes.txt")).toBe("my-notes");
  });

  it("strips the .md extension", () => {
    expect(titleFromFilename("README.md")).toBe("README");
  });

  it("falls back to 'Untitled' for a bare extension", () => {
    expect(titleFromFilename(".txt")).toBe("Untitled");
  });

  it("is case-insensitive for the extension", () => {
    expect(titleFromFilename("Notes.TXT")).toBe("Notes");
  });
});
