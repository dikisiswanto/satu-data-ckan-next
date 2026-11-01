/**
 * Normalize optional privacy markers from CKAN extensions/custom schemas.
 * CKAN core's `package.private` is boolean, but custom fields and legacy
 * metadata may serialize booleans as strings. Do not use Boolean(value): the
 * string "false" must never be interpreted as private (or as authorization).
 */
export function isPrivateMarker(value) {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on", "private"].includes(
    value.trim().toLowerCase(),
  );
}
