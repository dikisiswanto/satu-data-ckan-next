"""Pure helpers for the Wajo Admin publication analytics panel."""

from __future__ import annotations


CONTENT_TYPES = ("datasets", "indicators", "infographics", "publications")


def build_portal_facet_filters(portal_types):
    """Build disjoint Solr filters for general datasets and editorial types."""
    def quote_solr(value):
        escaped = str(value).replace("\\", "\\\\").replace('"', '\\"')
        return '"%s"' % escaped

    exclusion_terms = []
    for _, tag, portal_type in portal_types:
        exclusion_terms.extend((
            "-tags:%s" % quote_solr(tag),
            "-extras_portal_type:%s" % quote_solr(portal_type),
            "-dataset_type:%s" % quote_solr(portal_type),
        ))
    general_dataset_fq = "(*:* AND %s)" % " AND ".join(exclusion_terms)

    portal_fqs = {}
    for key, tag, portal_type in portal_types:
        own_terms = "(tags:%s OR extras_portal_type:%s OR dataset_type:%s)" % (
            quote_solr(tag), quote_solr(portal_type), quote_solr(portal_type),
        )
        other_terms = []
        for other_key, other_tag, other_type in portal_types:
            if other_key == key:
                continue
            other_terms.extend((
                "-tags:%s" % quote_solr(other_tag),
                "-extras_portal_type:%s" % quote_solr(other_type),
                "-dataset_type:%s" % quote_solr(other_type),
            ))
        portal_fqs[key] = "(%s AND %s)" % (own_terms, " AND ".join(other_terms))
    return general_dataset_fq, portal_fqs


def build_publisher_rows(organizations, facets, limit=10):
    """Return per-organization counts from four CKAN facet maps.

    ``None`` means at least one facet query failed; zero is only emitted when
    all four queries succeeded and an organization has no matching package.
    """
    if not isinstance(organizations, list) or not isinstance(facets, dict):
        return None
    if any(not isinstance(facets.get(key), dict) for key in CONTENT_TYPES):
        return None

    rows = []
    for organization in organizations:
        if not isinstance(organization, dict) or not organization.get("name"):
            continue
        name = str(organization["name"])
        counts = {key: int(facets[key].get(name, 0) or 0) for key in CONTENT_TYPES}
        total = sum(counts.values())
        if total:
            rows.append({
                "name": name,
                "title": organization.get("title") or name,
                "counts": counts,
                "total": total,
            })

    rows.sort(key=lambda row: (-row["total"], row["title"].casefold()))
    maximum = max((row["total"] for row in rows), default=0)
    for row in rows:
        row["share"] = round(row["total"] / maximum * 100) if maximum else 0
    return rows[: max(0, int(limit))]
