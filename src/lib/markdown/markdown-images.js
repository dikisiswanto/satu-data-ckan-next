import { parseMarkdown } from "./parse-markdown.js";

function findInlineImage(tokens, depth = 0) {
  if (!Array.isArray(tokens) || depth > 12) return null;
  for (const token of tokens) {
    if (
      token?.type === "image" &&
      typeof token.href === "string" &&
      token.href.trim()
    ) {
      return {
        href: token.href.trim(),
        alt: String(token.label || "").trim(),
        title: String(token.title || "").trim(),
      };
    }
    const nested = findInlineImage(token?.children, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function findBlockImage(blocks, depth = 0) {
  if (!Array.isArray(blocks) || depth > 12) return null;
  for (const block of blocks) {
    const inline = findInlineImage(block?.children);
    if (inline) return inline;

    const nestedBlocks = findBlockImage(block?.blocks, depth + 1);
    if (nestedBlocks) return nestedBlocks;

    if (Array.isArray(block?.items)) {
      for (const item of block.items) {
        const itemImage = findBlockImage(item?.blocks, depth + 1);
        if (itemImage) return itemImage;
      }
    }

    if (block?.type === "table") {
      const cells = [
        ...(Array.isArray(block.headers) ? block.headers : []),
        ...(Array.isArray(block.rows) ? block.rows.flat() : []),
      ];
      for (const cell of cells) {
        const cellImage = findBlockImage(parseMarkdown(cell), depth + 1);
        if (cellImage) return cellImage;
      }
    }
  }
  return null;
}

/** Return the first image declared in Markdown, without trusting or rewriting its URL. */
export function findFirstMarkdownImage(markdown) {
  const source = String(markdown || "");
  if (!source.trim()) return null;
  return findBlockImage(parseMarkdown(source));
}
