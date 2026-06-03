// Converts a TipTap JSON document to Markdown.
// Handles: headings, paragraphs, bullet/ordered lists, bold, italic, underline.
// No external dependencies — runs in the browser.

type Mark = { type: string };

type TextNode = {
  type: "text";
  text: string;
  marks?: Mark[];
};

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Mark[];
};

// ── Inline text serialization ────────────────────────────────

function serializeText(node: TextNode): string {
  let text = node.text ?? "";
  const marks = node.marks ?? [];

  // Apply marks inside-out (underline → italic → bold)
  const hasBold      = marks.some((m) => m.type === "bold");
  const hasItalic    = marks.some((m) => m.type === "italic");
  const hasUnderline = marks.some((m) => m.type === "underline");

  // Underline has no Markdown equivalent — use HTML
  if (hasUnderline) text = `<u>${text}</u>`;
  if (hasItalic)    text = `_${text}_`;
  if (hasBold)      text = `**${text}**`;

  return text;
}

function serializeInline(nodes: TiptapNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return serializeText(node as TextNode);
      // hardBreak → newline within paragraph
      if (node.type === "hardBreak") return "  \n";
      return "";
    })
    .join("");
}

// ── Block serialization ──────────────────────────────────────

function serializeListItem(node: TiptapNode, marker: string): string {
  const inner = (node.content ?? [])
    .map((child) => {
      if (child.type === "paragraph") return serializeInline(child.content);
      // Nested lists — indent with two spaces
      if (child.type === "bulletList")  return serializeBulletList(child, "  ");
      if (child.type === "orderedList") return serializeOrderedList(child, "  ");
      return "";
    })
    .join("\n");

  return `${marker}${inner}`;
}

function serializeBulletList(node: TiptapNode, prefix = ""): string {
  return (node.content ?? [])
    .map((item) => `${prefix}${serializeListItem(item, "- ")}`)
    .join("\n");
}

function serializeOrderedList(node: TiptapNode, prefix = ""): string {
  return (node.content ?? [])
    .map((item, i) => `${prefix}${serializeListItem(item, `${i + 1}. `)}`)
    .join("\n");
}

function serializeBlock(node: TiptapNode): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(Math.min(level, 6));
      return `${prefix} ${serializeInline(node.content)}`;
    }
    case "paragraph": {
      const text = serializeInline(node.content);
      return text; // empty paragraphs become blank lines via join
    }
    case "bulletList":
      return serializeBulletList(node);
    case "orderedList":
      return serializeOrderedList(node);
    case "horizontalRule":
      return "---";
    case "blockquote": {
      const inner = serializeBlocks(node.content ?? []);
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = serializeInline(node.content);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    default:
      return serializeInline(node.content);
  }
}

function serializeBlocks(nodes: TiptapNode[]): string {
  return nodes.map(serializeBlock).join("\n\n");
}

// ── Public API ───────────────────────────────────────────────

export function tiptapToMarkdown(doc: object): string {
  const root = doc as TiptapNode;
  if (root.type !== "doc" || !root.content) return "";
  return serializeBlocks(root.content).trimEnd();
}

// Triggers a browser file download of the generated Markdown.
export function downloadMarkdown(title: string, content: object | null): void {
  if (!content) return;

  const markdown = tiptapToMarkdown(content);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.trim() || "document"}.md`;
  a.click();

  URL.revokeObjectURL(url);
}
