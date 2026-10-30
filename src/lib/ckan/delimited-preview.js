/**
 * Parse a bounded CSV/TSV sample without adding a runtime dependency.
 * Supports quoted values, escaped quotes, CRLF and embedded newlines.
 */
export function detectDelimiter(text) {
  const counts = { ",": 0, "\t": 0, ";": 0 };
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) break;
    if (!quoted && Object.hasOwn(counts, char)) counts[char] += 1;
  }
  return Object.entries(counts).sort(
    (left, right) => right[1] - left[1],
  )[0]?.[1] > 0
    ? Object.entries(counts).sort((left, right) => right[1] - left[1])[0][0]
    : ",";
}

export function parseDelimitedPreview(input, { delimiter, maxRows = 25 } = {}) {
  const text = String(input || "").replace(/^\uFEFF/, "");
  const separator = delimiter || detectDelimiter(text);
  const parsed = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && char === separator) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) parsed.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      if (parsed.length >= maxRows + 2) break;
      continue;
    }
    cell += char;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) parsed.push(row);
  }

  if (!parsed.length)
    return { fields: [], records: [], hasMore: false, delimiter: separator };
  const header = parsed[0];
  const names = [];
  const used = new Map();
  for (let index = 0; index < header.length; index += 1) {
    const base = String(header[index] || "").trim() || `kolom_${index + 1}`;
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    names.push(count === 1 ? base : `${base}_${count}`);
  }

  const dataRows = parsed.slice(1, maxRows + 2);
  const hasMore = dataRows.length > maxRows;
  const records = dataRows.slice(0, maxRows).map((cells, rowIndex) => {
    const record = { _id: rowIndex + 1 };
    names.forEach((name, index) => {
      record[name] = cells[index] ?? "";
    });
    return record;
  });
  const fields = names.map((name) => ({
    id: name,
    type: "text",
    info: { label: name },
  }));
  return { fields, records, hasMore, delimiter: separator };
}
