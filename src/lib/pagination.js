/**
 * Return a compact, deterministic page range for accessible catalog pagination.
 * Ellipses are represented as stable string tokens so the UI can label them
 * without confusing them with a navigable page.
 */
export function getPaginationItems(currentPage, totalPages, siblingCount = 1) {
  const total = Math.max(1, Math.trunc(Number(totalPages) || 1));
  const current = Math.min(
    total,
    Math.max(1, Math.trunc(Number(currentPage) || 1)),
  );
  const siblings = Math.max(
    0,
    Math.min(2, Math.trunc(Number(siblingCount) || 0)),
  );

  if (total <= 7 + siblings * 2) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const candidates = new Set([1, total]);
  for (
    let page = Math.max(2, current - siblings);
    page <= Math.min(total - 1, current + siblings);
    page += 1
  ) {
    candidates.add(page);
  }

  const sorted = [...candidates].sort((a, b) => a - b);
  const items = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      if (page - previous === 2) items.push(previous + 1);
      else items.push(index === 1 ? "start-ellipsis" : "end-ellipsis");
    }
    items.push(page);
  }
  return items;
}

export function normalizePageNumber(value, fallback = 1, maximum = 10000) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, Math.max(1, Math.trunc(Number(maximum) || 1)));
}
