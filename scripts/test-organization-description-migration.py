#!/usr/bin/env python3
"""Focused regression tests for legacy CKAN organization profile migration."""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).with_name("migrate-organization-descriptions.py")
SPEC = importlib.util.spec_from_file_location(
    "organization_description_migration", SCRIPT
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Tidak dapat memuat skrip migrasi deskripsi organisasi")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

assert MODULE.legacy_organization_notes({"notes": "Profil lama"}) == "Profil lama"
assert (
    MODULE.legacy_organization_notes(
        {"extras": [{"key": "portal_contact", "value": "info"}, {"key": "notes", "value": "Profil extra"}]}
    )
    == "Profil extra"
)
assert MODULE.legacy_organization_notes({"extras": {"notes": "Profil dict"}}) == "Profil dict"
assert MODULE.legacy_organization_notes({"extras": [{"key": "notes", "value": "  "}]}) is None
assert MODULE.native_description({"description": "Deskripsi native"}) == "Deskripsi native"
assert MODULE.native_description({"description": "  "}) is None
assert MODULE.legacy_organization_notes(
    {
        "description": "Deskripsi native",
        "extras": [{"key": "notes", "value": "Profil lama"}],
    }
) == "Profil lama"

records = [
    {
        "id": "legacy-id",
        "name": "opd-legacy",
        "extras": [{"key": "notes", "value": "Profil lama"}],
    },
    {
        "id": "existing-id",
        "name": "opd-existing",
        "description": "Deskripsi yang harus dipertahankan",
        "extras": [{"key": "notes", "value": "Profil lain"}],
    },
    {"id": "empty-id", "name": "opd-empty", "extras": []},
]
actions = []


def fake_action_request(_url, action, params, _api_key=None):
    actions.append((action, params))
    if action == "organization_list":
        return records
    return {"id": params["id"]}


MODULE.action_request = fake_action_request
assert MODULE.migrate("https://ckan.example/api/3/action", None, False, 100) == (3, 1)
assert [action for action, _params in actions] == ["organization_list"]

actions.clear()
assert MODULE.migrate("https://ckan.example/api/3/action", "sysadmin-token", True, 100) == (3, 1)
patches = [(action, params) for action, params in actions if action == "organization_patch"]
assert patches == [
    (
        "organization_patch",
        {"id": "legacy-id", "description": "Profil lama"},
    )
]

print("PASS organization description migration helpers and dry-run/apply behavior")
