"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Toolbar from "./Toolbar";
import { useEffect } from "react";

interface EditorProps {
  /** TipTap JSON document object, or null for an empty doc */
  content: object | null;
  onChange: (json: object) => void;
  editable?: boolean;
  placeholder?: string;
}

export default function Editor({
  content,
  onChange,
  editable = true,
  placeholder = "Start writing…",
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    // Pass null/undefined as empty string so TipTap renders a blank doc
    content: content ?? "",
    editable,
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
  });

  // Re-sync when the document switches (e.g. navigating between docs)
  useEffect(() => {
    if (!editor || !content) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content);
    if (current !== incoming) {
      editor.commands.setContent(content, false); // false = don't emit onUpdate
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {editable && <Toolbar editor={editor} />}
      <div className="flex-1 px-8 py-6 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
