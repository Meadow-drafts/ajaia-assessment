"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

// A null entry renders a vertical divider between groups
type ToolbarItem =
  | { type: "button"; label: string; icon: React.ReactNode; action: () => void; isActive: boolean }
  | { type: "divider" };

function Divider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

function ToolbarButton({
  label,
  icon,
  action,
  isActive,
}: Extract<ToolbarItem, { type: "button" }>) {
  return (
    <button
      onMouseDown={(e) => {
        // prevent editor blur on toolbar click
        e.preventDefault();
        action();
      }}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {icon}
    </button>
  );
}

export default function Toolbar({ editor }: ToolbarProps) {
  const items: ToolbarItem[] = [
    // ── Inline formatting ──────────────────────────────────
    {
      type: "button",
      label: "Bold (⌘B)",
      icon: <Bold className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      type: "button",
      label: "Italic (⌘I)",
      icon: <Italic className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      type: "button",
      label: "Underline (⌘U)",
      icon: <Underline className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
    },

    { type: "divider" },

    // ── Headings ───────────────────────────────────────────
    {
      type: "button",
      label: "Heading 1",
      icon: <Heading1 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      type: "button",
      label: "Heading 2",
      icon: <Heading2 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      type: "button",
      label: "Heading 3",
      icon: <Heading3 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },

    { type: "divider" },

    // ── Lists ──────────────────────────────────────────────
    {
      type: "button",
      label: "Bullet list",
      icon: <List className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      type: "button",
      label: "Numbered list",
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b px-3 py-2 bg-background sticky top-0 z-10">
      {items.map((item, i) =>
        item.type === "divider" ? (
          <Divider key={i} />
        ) : (
          <ToolbarButton key={item.label} {...item} />
        )
      )}
    </div>
  );
}
