#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  getPaginationItems,
  normalizePageNumber,
} from "../src/lib/pagination.js";

assert.deepEqual(getPaginationItems(2, 5), [1, 2, 3, 4, 5]);
assert.deepEqual(getPaginationItems(8, 20), [
  1,
  "start-ellipsis",
  7,
  8,
  9,
  "end-ellipsis",
  20,
]);
assert.deepEqual(getPaginationItems(4, 8), [1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual(getPaginationItems(99, 5), [1, 2, 3, 4, 5]);
assert.equal(normalizePageNumber("-4"), 1);
assert.equal(normalizePageNumber("9", 1, 4), 4);
assert.equal(normalizePageNumber("1.5"), 1);
assert.equal(normalizePageNumber("invalid"), 1);

process.stdout.write(
  "Pagination behavior passed: compact ranges, ellipses, bounds, and invalid query normalization.\n",
);
