// Pure helpers — no framework deps, safe to import in tests.

export const ALLOWED_EXTENSIONS = /\.(txt|md)$/i;
export const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

export type FileValidationError =
  | "INVALID_EXTENSION"
  | "INVALID_MIME"
  | "FILE_TOO_LARGE";

const ALLOWED_MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];

export function validateUploadedFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidationError | null {
  if (!ALLOWED_EXTENSIONS.test(file.name)) return "INVALID_EXTENSION";
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) return "INVALID_MIME";
  if (file.size > MAX_FILE_SIZE_BYTES) return "FILE_TOO_LARGE";
  return null;
}

export function titleFromFilename(filename: string): string {
  return filename.replace(ALLOWED_EXTENSIONS, "").trim() || "Untitled";
}

// Converts plain text to a TipTap JSON document.
// Each line becomes a paragraph node; blank lines produce empty paragraphs
// so the visual spacing in the original file is preserved.
export function textToTiptap(text: string): object {
  const content = text.split("\n").map((line) => ({
    type: "paragraph",
    ...(line.trim() ? { content: [{ type: "text", text: line }] } : {}),
  }));

  return { type: "doc", content };
}
