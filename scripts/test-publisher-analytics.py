#!/usr/bin/env python3
"""Behavior tests for per-OPD publishing analytics aggregation."""

import importlib.util
from pathlib import Path

MODULE = (
    Path(__file__).resolve().parents[1]
    / "deploy/ckan/theme/ckanext/wajo_theme/publisher_analytics.py"
)
SPEC = importlib.util.spec_from_file_location("publisher_analytics", MODULE)
MODULE_OBJECT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE_OBJECT)


def main():
    organizations = [
        {"name": "bappeda", "title": "Bappeda"},
        {"name": "dinkes", "title": "Dinas Kesehatan"},
        {"name": "empty", "title": "OPD Kosong"},
    ]
    facets = {
        "datasets": {"bappeda": 1},
        "indicators": {"bappeda": 1},
        "infographics": {"dinkes": 1},
        "publications": {"bappeda": 1},
    }
    general_filter, portal_filters = MODULE_OBJECT.build_portal_facet_filters((
        ("indicators", "portal-indikator", "indikator"),
        ("infographics", "portal-infografik", "infografik"),
        ("publications", "portal-publikasi", "publikasi"),
    ))
    assert "-tags:\"portal-infografik\"" in general_filter
    assert "-tags:\"portal-publikasi\"" in portal_filters["indicators"]
    assert "-extras_portal_type:\"indikator\"" in portal_filters["publications"]
    assert len(portal_filters) == 3

    rows = MODULE_OBJECT.build_publisher_rows(organizations, facets)
    assert rows is not None
    assert rows[0]["name"] == "bappeda"
    assert rows[0]["counts"] == {
        "datasets": 1, "indicators": 1, "infographics": 0, "publications": 1
    }
    assert rows[0]["total"] == 3 and rows[0]["share"] == 100
    assert rows[1]["name"] == "dinkes"
    assert rows[1]["counts"]["datasets"] == 0
    assert rows[1]["counts"]["infographics"] == 1
    assert MODULE_OBJECT.build_publisher_rows(organizations, {"datasets": {}}) is None
    assert MODULE_OBJECT.build_publisher_rows(organizations, facets, limit=1)[0]["name"] == "bappeda"
    print("Publisher analytics behavior tests passed: per-OPD type counts, sorting, percentages, and fail-closed availability.")


if __name__ == "__main__":
    main()
