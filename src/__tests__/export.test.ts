import { describe, it, expect } from "vitest";
import { tiptapToMarkdown } from "@/lib/export";

function doc(...content: object[]) {
  return { type: "doc", content };
}
function p(...inline: object[]) {
  return { type: "paragraph", content: inline };
}
function text(t: string, ...marks: string[]) {
  return {
    type: "text",
    text: t,
    ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
  };
}
function heading(level: number, ...inline: object[]) {
  return { type: "heading", attrs: { level }, content: inline };
}
function bulletList(...items: object[][]) {
  return {
    type: "bulletList",
    content: items.map((children) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: children }],
    })),
  };
}
function orderedList(...items: object[][]) {
  return {
    type: "orderedList",
    content: items.map((children) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: children }],
    })),
  };
}

describe("tiptapToMarkdown", () => {
  it("returns empty string for an empty doc", () => {
    expect(tiptapToMarkdown(doc())).toBe("");
  });

  it("converts a plain paragraph", () => {
    expect(tiptapToMarkdown(doc(p(text("Hello world"))))).toBe("Hello world");
  });

  it("converts headings H1–H3", () => {
    const result = tiptapToMarkdown(
      doc(
        heading(1, text("Title")),
        heading(2, text("Subtitle")),
        heading(3, text("Section"))
      )
    );
    expect(result).toBe("# Title\n\n## Subtitle\n\n### Section");
  });

  it("converts bold text", () => {
    expect(tiptapToMarkdown(doc(p(text("hello", "bold"))))).toBe("**hello**");
  });

  it("converts italic text", () => {
    expect(tiptapToMarkdown(doc(p(text("hello", "italic"))))).toBe("_hello_");
  });

  it("converts bold + italic combined", () => {
    expect(tiptapToMarkdown(doc(p(text("hello", "bold", "italic"))))).toBe("**_hello_**");
  });

  it("wraps underline in HTML since Markdown has no underline", () => {
    expect(tiptapToMarkdown(doc(p(text("hello", "underline"))))).toBe("<u>hello</u>");
  });

  it("converts a bullet list", () => {
    const result = tiptapToMarkdown(
      doc(bulletList([text("Alpha")], [text("Beta")], [text("Gamma")]))
    );
    expect(result).toBe("- Alpha\n- Beta\n- Gamma");
  });

  it("converts an ordered list", () => {
    const result = tiptapToMarkdown(
      doc(orderedList([text("First")], [text("Second")], [text("Third")]))
    );
    expect(result).toBe("1. First\n2. Second\n3. Third");
  });

  it("separates blocks with a blank line", () => {
    const result = tiptapToMarkdown(
      doc(p(text("First")), p(text("Second")))
    );
    expect(result).toBe("First\n\nSecond");
  });

  it("produces an empty line for a blank paragraph (visual spacing)", () => {
    const result = tiptapToMarkdown(
      doc(p(text("Before")), { type: "paragraph" }, p(text("After")))
    );
    expect(result).toBe("Before\n\n\n\nAfter");
  });

  it("mixes inline marks and plain text in one paragraph", () => {
    const result = tiptapToMarkdown(
      doc(p(text("Hello "), text("world", "bold"), text("!")))
    );
    expect(result).toBe("Hello **world**!");
  });
});
