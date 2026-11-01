const SEARCH_STOPWORDS_ID = new Set([
  "dan",
  "atau",
  "yang",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "dengan",
  "sebagai",
  "dalam",
  "oleh",
  "adalah",
  "ini",
  "itu",
  "apa",
  "berapa",
  "dimana",
  "data",
]);

const BASE_SEARCH_FIELDS = Object.freeze([
  "title",
  "notes",
  "tags",
  "organization",
  "groups",
  "res_name",
  "res_description",
]);

/**
 * Convert ordinary Indonesian search text to a bounded CKAN/Solr query.
 * Each meaningful token can match independently across searchable fields,
 * matching the broad discovery behavior used by the dataset catalogue. Only known Solr field identifiers are used.
 */
export function buildPublicCatalogQuery(value, extraFields = []) {
  const tokens =
    String(value || "")
      .normalize("NFKC")
      .match(/[\p{L}\p{N}]+/gu) || [];
  const uniqueTokens = [
    ...new Set(tokens.map((token) => token.toLocaleLowerCase("id-ID"))),
  ]
    .filter((token) => token.length > 1 && !SEARCH_STOPWORDS_ID.has(token))
    .slice(0, 12);
  if (!uniqueTokens.length) return "*:*";

  const fields = [
    ...new Set(
      [
        ...BASE_SEARCH_FIELDS,
        ...(Array.isArray(extraFields) ? extraFields : []),
      ].filter(
        (field) =>
          typeof field === "string" && /^[a-z][a-z0-9_]*$/i.test(field),
      ),
    ),
  ];

  const clauses = uniqueTokens.map((token) => {
    const term = token.replace(/[\\"^]/g, "\\$&");
    return `(${fields.map((field) => `${field}:"${term}"`).join(" OR ")})`;
  });
  return `(${clauses.join(" OR ")})`;
}

export function normalizePublicCatalogSort(value, query = "") {
  if (value === "judul") return "title_string asc";
  if (value === "relevansi" && String(query || "").trim()) {
    return "score desc, metadata_modified desc";
  }
  return "metadata_modified desc";
}
