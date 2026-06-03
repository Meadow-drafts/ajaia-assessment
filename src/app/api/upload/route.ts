import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  validateUploadedFile,
  titleFromFilename,
  textToTiptap,
} from "@/lib/document-utils";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return err("Unauthorized", 401);

  // ── Parse form data ─────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return err("Invalid form data", 400);
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return err("No file provided. Send a 'file' field in the form data.", 400);
  }

  // ── Validate file ────────────────────────────────────────────
  const validationError = validateUploadedFile(file);
  if (validationError === "INVALID_EXTENSION") return err("Only .txt and .md files are supported.", 415);
  if (validationError === "INVALID_MIME")      return err("Invalid file type. Expected text/plain or text/markdown.", 415);
  if (validationError === "FILE_TOO_LARGE")    return err("File too large. Maximum size is 1 MB.", 413);

  // ── Read content ─────────────────────────────────────────────
  let rawText: string;
  try {
    rawText = await file.text();
  } catch {
    return err("Failed to read file contents.", 422);
  }

  const title = titleFromFilename(file.name);
  const content = textToTiptap(rawText);

  // ── Persist ──────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title, content })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[upload] insert failed:", error?.message);
    return err("Failed to save document. Please try again.", 500);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
