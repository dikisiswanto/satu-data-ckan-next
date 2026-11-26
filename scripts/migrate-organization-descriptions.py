#!/usr/bin/env python3
"""Copy legacy organization `notes` extras into CKAN's native description.

Dry-run is the default. Pass --apply to write changes. The legacy extra is
intentionally retained, so this migration is reversible and does not discard
metadata. Organizations with an existing description are never overwritten.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_API_URL = "http://127.0.0.1:5000/api/3/action"


def has_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def legacy_organization_notes(organization: dict) -> str | None:
    """Return a legacy notes field from Scheming or CKAN extras."""
    direct = organization.get("notes")
    if has_text(direct):
        return direct

    extras = organization.get("extras")
    if isinstance(extras, list):
        for extra in extras:
            if isinstance(extra, dict) and extra.get("key") == "notes":
                value = extra.get("value")
                if has_text(value):
                    return value
    elif isinstance(extras, dict):
        value = extras.get("notes")
        if has_text(value):
            return value
    return None


def native_description(organization: dict) -> str | None:
    value = organization.get("description")
    return value if has_text(value) else None


def action_request(
    base_url: str,
    action: str,
    params: dict,
    api_key: str | None = None,
) -> object:
    url = f"{base_url.rstrip('/')}/{action}"
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = api_key

    if action == "organization_list":
        query = urlencode(
            {
                key: str(value).lower() if isinstance(value, bool) else value
                for key, value in params.items()
            }
        )
        request = Request(f"{url}?{query}", headers=headers, method="GET")
    else:
        headers["Content-Type"] = "application/json"
        request = Request(
            url,
            data=json.dumps(params).encode("utf-8"),
            headers=headers,
            method="POST",
        )

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(
            f"CKAN API {action} failed (HTTP {error.code}): {detail}"
        ) from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"CKAN API {action} could not be reached: {error}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"CKAN API {action} returned invalid JSON") from error

    if not isinstance(payload, dict) or payload.get("success") is not True:
        detail = payload.get("error") if isinstance(payload, dict) else payload
        raise RuntimeError(f"CKAN API {action} returned an error: {detail}")
    return payload.get("result")


def organizations_from_ckan(
    base_url: str, api_key: str | None, page_size: int
):
    offset = 0
    while True:
        records = action_request(
            base_url,
            "organization_list",
            {
                "all_fields": True,
                "include_extras": True,
                "limit": page_size,
                "offset": offset,
            },
            api_key,
        )
        if not isinstance(records, list):
            raise RuntimeError("CKAN organization_list did not return a list")
        yield from records
        if len(records) < page_size:
            break
        offset += len(records)


def migrate(
    api_url: str,
    api_key: str | None,
    apply_changes: bool,
    page_size: int,
) -> tuple[int, int]:
    examined = 0
    migrated = 0
    for organization in organizations_from_ckan(api_url, api_key, page_size):
        if not isinstance(organization, dict):
            continue
        examined += 1
        existing_description = native_description(organization)
        legacy_notes = legacy_organization_notes(organization)
        if existing_description or not legacy_notes:
            continue

        identifier = organization.get("id") or organization.get("name")
        if not identifier:
            print("SKIP organisasi tanpa id/name", file=sys.stderr)
            continue

        name = organization.get("name") or identifier
        if apply_changes:
            action_request(
                api_url,
                "organization_patch",
                {"id": identifier, "description": legacy_notes},
                api_key,
            )
            print(f"MIGRATED {name}: notes → description")
        else:
            print(f"DRY-RUN {name}: notes akan disalin ke description")
        migrated += 1

    return examined, migrated


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Salin extra organisasi CKAN bernama 'notes' ke kolom description "
            "bawaan CKAN tanpa menghapus nilai sumber."
        )
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Tulis perubahan ke CKAN. Tanpa opsi ini hanya menampilkan dry-run.",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=100,
        help="Jumlah organisasi per halaman (1–1000, default 100).",
    )
    args = parser.parse_args()

    if not 1 <= args.page_size <= 1000:
        parser.error("--page-size harus berada pada rentang 1–1000")

    api_url = os.environ.get("CKAN_API_URL", DEFAULT_API_URL).strip()
    api_key = os.environ.get("CKAN_API_KEY", "").strip() or None
    if args.apply and not api_key:
        parser.error("CKAN_API_KEY wajib diisi saat menggunakan --apply")

    try:
        examined, migrated = migrate(api_url, api_key, args.apply, args.page_size)
    except RuntimeError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    mode = "apply" if args.apply else "dry-run"
    print(
        f"Selesai ({mode}): {examined} organisasi diperiksa, "
        f"{migrated} profil {'disalin' if args.apply else 'siap disalin'}."
    )
    if not args.apply and migrated:
        print("Jalankan ulang dengan --apply untuk menyimpan perubahan.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
