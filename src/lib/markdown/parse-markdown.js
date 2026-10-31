const MAX_SOURCE_LENGTH = 240_000;
const MAX_BLOCK_DEPTH = 12;

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function findClosingBracket(source, start) {
  let depth = 0;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function readDestination(source) {
  let index = 0;
  while (/\s/.test(source[index] || "")) index += 1;
  if (source[index] === "<") {
    const end = source.indexOf(">", index + 1);
    if (end < 0) return null;
    const href = source.slice(index + 1, end);
    index = end + 1;
    while (/\s/.test(source[index] || "")) index += 1;
    let title = "";
    if (index < source.length) {
      const quote = source[index];
      const closing = quote === "(" ? ")" : quote;
      if (!["'", '"', "("].includes(quote)) return null;
      const titleEnd = source.lastIndexOf(closing);
      if (titleEnd <= index) return null;
      title = source.slice(index + 1, titleEnd);
      index = titleEnd + 1;
      while (/\s/.test(source[index] || "")) index += 1;
    }
    return index === source.length ? { href, title } : null;
  }

  let depth = 0;
  let escaped = false;
  let destinationEnd = source.length;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      if (depth === 0) return null;
      depth -= 1;
    }
    if (/\s/.test(char) && depth === 0) {
      destinationEnd = cursor;
      break;
    }
  }
  const href = source.slice(index, destinationEnd);
  let title = "";
  index = destinationEnd;
  while (/\s/.test(source[index] || "")) index += 1;
  if (index < source.length) {
    const quote = source[index];
    const closing = quote === "(" ? ")" : quote;
    if (!["'", '"', "("].includes(quote)) return null;
    const titleEnd = source.lastIndexOf(closing);
    if (titleEnd <= index) return null;
    title = source.slice(index + 1, titleEnd);
    index = titleEnd + 1;
    while (/\s/.test(source[index] || "")) index += 1;
  }
  return href && index === source.length ? { href, title } : null;
}

function parseReferenceDefinitions(source) {
  const references = new Map();
  const lines = source.split("\n");
  const retained = [];
  for (const line of lines) {
    const match = line.match(
      /^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+["'(](.*?)["')])?\s*$/,
    );
    if (match) {
      references.set(normalizeLabel(match[1]), {
        href: match[2] || match[3],
        title: match[4] || "",
      });
    } else retained.push(line);
  }
  return { source: retained.join("\n"), references };
}

function parseInline(source, references, depth = 0) {
  if (depth > 8 || !source) return [{ type: "text", value: source || "" }];
  const tokens = [];
  let plain = "";
  const flush = () => {
    if (plain) {
      tokens.push({ type: "text", value: plain });
      plain = "";
    }
  };
  const delimiters = ["**", "__", "~~", "*", "_"];

  for (let index = 0; index < source.length;) {
    if (
      source[index] === "\\" &&
      index + 1 < source.length &&
      /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(source[index + 1])
    ) {
      plain += source[index + 1];
      index += 2;
      continue;
    }

    if (source[index] === "`") {
      let ticks = 1;
      while (source[index + ticks] === "`") ticks += 1;
      const marker = "`".repeat(ticks);
      const end = source.indexOf(marker, index + ticks);
      if (end >= 0) {
        flush();
        let value = source.slice(index + ticks, end).replace(/\n/g, " ");
        if (/^ .* $/.test(value) && value.trim()) value = value.slice(1, -1);
        tokens.push({ type: "code", value });
        index = end + ticks;
        continue;
      }
    }

    const image = source.startsWith("![", index);
    if (image || source[index] === "[") {
      const labelStart = index + (image ? 2 : 1);
      const labelEnd = findClosingBracket(source, labelStart - 1);
      if (labelEnd >= 0) {
        const label = source.slice(labelStart, labelEnd);
        let after = labelEnd + 1;
        let reference = null;
        let destination = null;
        if (source[after] === "(") {
          let close = after + 1;
          let parens = 1;
          let escaped = false;
          for (; close < source.length; close += 1) {
            if (escaped) {
              escaped = false;
              continue;
            }
            if (source[close] === "\\") {
              escaped = true;
              continue;
            }
            if (source[close] === "(") parens += 1;
            if (source[close] === ")" && --parens === 0) break;
          }
          if (close < source.length)
            destination = readDestination(source.slice(after + 1, close));
          if (destination) after = close + 1;
        } else if (source[after] === "[") {
          const referenceEnd = findClosingBracket(source, after);
          if (referenceEnd >= 0) {
            const referenceLabel =
              source.slice(after + 1, referenceEnd) || label;
            reference = references.get(normalizeLabel(referenceLabel));
            if (reference) after = referenceEnd + 1;
          }
        } else {
          reference = references.get(normalizeLabel(label));
        }
        const target = destination || reference;
        if (target && target.href) {
          flush();
          tokens.push({
            type: image ? "image" : "link",
            label,
            href: target.href,
            title: target.title || "",
            children: image
              ? undefined
              : parseInline(label, references, depth + 1),
          });
          index = after;
          continue;
        }
      }
    }

    if (source[index] === "<") {
      const end = source.indexOf(">", index + 1);
      if (end > index) {
        const candidate = source.slice(index + 1, end);
        if (/^https?:\/\/[^\s<>]+$/i.test(candidate)) {
          flush();
          tokens.push({
            type: "link",
            href: candidate,
            label: candidate,
            children: [{ type: "text", value: candidate }],
          });
          index = end + 1;
          continue;
        }
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(candidate)) {
          flush();
          tokens.push({
            type: "link",
            href: `mailto:${candidate}`,
            label: candidate,
            children: [{ type: "text", value: candidate }],
          });
          index = end + 1;
          continue;
        }
        // Inline HTML is intentionally rendered as text, never as executable markup.
        if (/^\/?[A-Za-z][^>]*$/.test(candidate)) {
          plain += source.slice(index, end + 1);
          index = end + 1;
          continue;
        }
      }
    }

    let matchedDelimiter = null;
    for (const delimiter of delimiters) {
      if (!source.startsWith(delimiter, index)) continue;
      if (
        !source[index + delimiter.length] ||
        /\s/.test(source[index + delimiter.length])
      )
        continue;
      const close = source.indexOf(delimiter, index + delimiter.length);
      if (close <= index + delimiter.length || /\s/.test(source[close - 1]))
        continue;
      matchedDelimiter = { delimiter, close };
      break;
    }
    if (matchedDelimiter) {
      flush();
      const value = source.slice(
        index + matchedDelimiter.delimiter.length,
        matchedDelimiter.close,
      );
      const type =
        matchedDelimiter.delimiter === "~~"
          ? "delete"
          : matchedDelimiter.delimiter.length === 2
            ? "strong"
            : "emphasis";
      tokens.push({
        type,
        children: parseInline(value, references, depth + 1),
      });
      index = matchedDelimiter.close + matchedDelimiter.delimiter.length;
      continue;
    }

    const bareLink = source
      .slice(index)
      .match(
        /^(https?:\/\/[^\s<>]+|www\.[^\s<>]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
      );
    if (bareLink) {
      flush();
      let href = bareLink[0];
      let label = href;
      while (/[.,!?;:]$/.test(href)) href = href.slice(0, -1);
      const suffix = label.slice(href.length);
      if (href) {
        const target = href.startsWith("www.")
          ? `https://${href}`
          : href.includes("@") && !href.includes("://")
            ? `mailto:${href}`
            : href;
        tokens.push({
          type: "link",
          href: target,
          label: href,
          children: [{ type: "text", value: href }],
        });
        if (suffix) tokens.push({ type: "text", value: suffix });
        index += bareLink[0].length;
        continue;
      }
    }

    if (source[index] === "\n") {
      const hardBreak = / {2,}$/.test(plain);
      if (hardBreak) plain = plain.replace(/ {2,}$/, "");
      flush();
      tokens.push({ type: hardBreak ? "break" : "softbreak" });
      index += 1;
      continue;
    }

    plain += source[index];
    index += 1;
  }
  flush();
  return tokens;
}

function splitTableRow(line) {
  let value = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      cell += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length || !lines[index].includes("|")) return false;
  const divider = splitTableRow(lines[index + 1]);
  return (
    divider.length > 0 && divider.every((cell) => /^:?-{3,}:?$/.test(cell))
  );
}

function isThematicBreak(line) {
  return /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
}

function listMarker(line) {
  return line.match(/^( *)([-+*]|\d{1,9}[.)])\s+(.*)$/);
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  return Boolean(
    isTableStart(lines, index) ||
    /^ {0,3}#{1,6}(?:\s|$)/.test(line) ||
    /^ {0,3}(?:`{3,}|~{3,})/.test(line) ||
    /^ {0,3}>/.test(line) ||
    isThematicBreak(line) ||
    listMarker(line) ||
    (index + 1 < lines.length &&
      /^ {0,3}(?:=+|-+)\s*$/.test(lines[index + 1]) &&
      line.trim()),
  );
}

function parseList(lines, start, references, depth) {
  const first = listMarker(lines[start]);
  const baseIndent = first[1].length;
  const ordered = /^\d/.test(first[2]);
  const delimiter = ordered ? first[2].slice(-1) : first[2];
  const items = [];
  let index = start;
  while (index < lines.length) {
    const marker = listMarker(lines[index]);
    if (
      !marker ||
      marker[1].length !== baseIndent ||
      /^\d/.test(marker[2]) !== ordered
    )
      break;
    if (ordered && marker[2].slice(-1) !== delimiter) break;
    const raw = [marker[3]];
    index += 1;
    let blank = false;
    while (index < lines.length) {
      const next = lines[index];
      const nextMarker = listMarker(next);
      if (nextMarker && nextMarker[1].length === baseIndent) break;
      if (!next.trim()) {
        blank = true;
        if (index + 1 >= lines.length) {
          index += 1;
          break;
        }
        const after = lines[index + 1];
        const afterMarker = listMarker(after);
        if (afterMarker && afterMarker[1].length <= baseIndent) break;
        if (after.trim() && after.match(/^ */)[0].length <= baseIndent) break;
        raw.push("");
        index += 1;
        continue;
      }
      const indent = next.match(/^ */)[0].length;
      if (indent > baseIndent) {
        raw.push(
          next.slice(Math.min(next.length, baseIndent + (next.trim() ? 2 : 0))),
        );
        index += 1;
        continue;
      }
      if (blank && isBlockStart(lines, index)) break;
      if (!blank && !isBlockStart(lines, index) && index > start) {
        raw.push(next);
        index += 1;
        continue;
      }
      break;
    }
    const task = raw[0].match(/^\[([ xX])\]\s+(.*)$/);
    if (task) raw[0] = task[2];
    const parsed = parseBlocks(raw, references, depth + 1);
    items.push({ checked: task ? /x/i.test(task[1]) : null, blocks: parsed });
  }
  return {
    index,
    node: {
      type: "list",
      ordered,
      start: ordered ? Number(first[2].slice(0, -1)) || 1 : 1,
      items,
    },
  };
}

function parseBlocks(lines, references, depth = 0) {
  if (depth > MAX_BLOCK_DEPTH)
    return [
      {
        type: "paragraph",
        children: parseInline(lines.join("\n"), references),
      },
    ];
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(line);
      const alignments = splitTableRow(lines[index + 1]).map((cell) =>
        cell.startsWith(":")
          ? cell.endsWith(":")
            ? "center"
            : "left"
          : cell.endsWith(":")
            ? "right"
            : "left",
      );
      index += 2;
      const rows = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      )
        rows.push(splitTableRow(lines[index++]));
      blocks.push({ type: "table", headers, alignments, rows });
      continue;
    }

    const fence = line.match(/^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/);
    if (fence) {
      const marker = fence[1];
      const language = (fence[2] || "").slice(0, 32);
      index += 1;
      const code = [];
      while (
        index < lines.length &&
        !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(
          lines[index],
        )
      )
        code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, value: code.join("\n") });
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?:\s+|$)(.*)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2].replace(/\s+#+\s*$/, ""), references),
      });
      index += 1;
      continue;
    }
    if (
      index + 1 < lines.length &&
      /^ {0,3}(=+|-+)\s*$/.test(lines[index + 1]) &&
      line.trim()
    ) {
      blocks.push({
        type: "heading",
        level: lines[index + 1].trim().startsWith("=") ? 1 : 2,
        children: parseInline(line.trim(), references),
      });
      index += 2;
      continue;
    }
    if (isThematicBreak(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^ {0,3}>/.test(lines[index]))
        quote.push(lines[index++].replace(/^ {0,3}> ?/, ""));
      blocks.push({
        type: "blockquote",
        blocks: parseBlocks(quote, references, depth + 1),
      });
      continue;
    }

    if (listMarker(line)) {
      const result = parseList(lines, index, references, depth);
      if (result.index > index) {
        blocks.push(result.node);
        index = result.index;
        continue;
      }
    }

    if (/^(?: {4}|\t)/.test(line)) {
      const code = [];
      while (
        index < lines.length &&
        (/^(?: {4}|\t)/.test(lines[index]) || !lines[index].trim())
      ) {
        code.push(lines[index].replace(/^(?: {4}|\t)/, ""));
        index += 1;
      }
      while (code.length && !code.at(-1)) code.pop();
      blocks.push({ type: "code", language: "", value: code.join("\n") });
      continue;
    }

    // HTML blocks are kept inert as text. CKAN content is editorial data, not trusted markup.
    if (
      /^ {0,3}<(?:!--|\/?(?:address|article|aside|blockquote|div|h[1-6]|hr|ol|p|pre|section|table|ul)(?:\s|>|\/))/i.test(
        line,
      )
    ) {
      const html = [];
      while (index < lines.length && lines[index].trim())
        html.push(lines[index++]);
      blocks.push({
        type: "paragraph",
        children: [{ type: "text", value: html.join("\n") }],
      });
      continue;
    }

    const paragraph = [line.replace(/^ {0,3}/, "")];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines, index)
    )
      paragraph.push(lines[index++].replace(/^ {0,3}/, ""));
    blocks.push({
      type: "paragraph",
      children: parseInline(paragraph.join("\n"), references),
    });
  }
  return blocks;
}

export function parseMarkdown(source) {
  const bounded = String(source || "")
    .replace(/\r\n?/g, "\n")
    .slice(0, MAX_SOURCE_LENGTH);
  const { source: content, references } = parseReferenceDefinitions(bounded);
  return parseBlocks(content.split("\n"), references);
}
