#!/usr/bin/env python3
"""Validate Wajo CSS contracts from parsed CSS rules, not formatted source text.

The checker intentionally treats whitespace, selector line wrapping, declaration
ordering, comments, and equivalent leading-zero numeric notation as formatting.
It still fails when a required selector, declaration, responsive rule, or visual
contrast contract is actually removed or changed.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    import tinycss2
except ImportError as exc:  # pragma: no cover - exercised in CI environment
    raise SystemExit(
        "tinycss2 is required for semantic CSS checks. Install requirements-ci.txt first."
    ) from exc


DEFAULT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class CssRule:
    selector: str
    declarations: dict[str, list[tuple[str, bool]]]
    media: tuple[str, ...]
    source: str


def normalized_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalized_selector(value: str) -> str:
    value = normalized_space(value)
    value = re.sub(r"\s*,\s*", ", ", value)
    value = re.sub(r"\s*([>+~])\s*", r" \1 ", value)
    # Formatting inside selector functions may put line breaks after '(' or
    # before ')'; those spaces do not change selector-list membership.
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    return normalized_space(value)


def normalized_value(value: str) -> str:
    value = normalized_space(value).lower()
    # CSS accepts both .625rem and 0.625rem. Treat them as the same value.
    value = re.sub(r"(?<![\w-])\.(\d)", r"0.\1", value)
    value = re.sub(r"\s*,\s*", ", ", value)
    value = re.sub(r"\s*/\s*", " / ", value)
    return normalized_space(value)


def parse_stylesheet(path: Path, source_name: str) -> tuple[list[CssRule], list[str]]:
    source = path.read_text(encoding="utf-8")
    parsed = tinycss2.parse_stylesheet(source, skip_comments=True, skip_whitespace=True)
    rules: list[CssRule] = []
    errors: list[str] = []

    def walk(nodes: Iterable[object], media: tuple[str, ...] = ()) -> None:
        for node in nodes:
            node_type = getattr(node, "type", None)
            if node_type == "error":
                errors.append(f"{source_name}: {getattr(node, 'message', 'CSS parse error')}")
                continue
            if node_type == "qualified-rule":
                selector = normalized_selector(tinycss2.serialize(node.prelude))
                declarations: dict[str, list[tuple[str, bool]]] = {}
                parsed_declarations = tinycss2.parse_declaration_list(
                    node.content, skip_comments=True, skip_whitespace=True
                )
                for declaration in parsed_declarations:
                    if declaration.type == "error":
                        errors.append(f"{source_name}: {declaration.message}")
                        continue
                    if declaration.type != "declaration":
                        continue
                    declarations.setdefault(declaration.lower_name, []).append(
                        (normalized_value(tinycss2.serialize(declaration.value)), bool(declaration.important))
                    )
                rules.append(CssRule(selector, declarations, media, source_name))
                continue
            if node_type == "at-rule" and node.content is not None:
                at_name = node.lower_at_keyword
                at_params = normalized_space(tinycss2.serialize(node.prelude))
                nested_media = media + ((f"@{at_name} {at_params}".strip()),)
                nested_nodes = tinycss2.parse_rule_list(
                    node.content, skip_comments=True, skip_whitespace=True
                )
                walk(nested_nodes, nested_media)

    walk(parsed)
    return rules, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="project root (used by regression tests)")
    args = parser.parse_args()
    root = args.root.resolve()

    theme_root = root / "deploy/ckan/theme/ckanext/wajo_theme/assets/css"
    paths = {
        "base": theme_root / "wajo-theme.css",
        "design": theme_root / "wajo-admin-design-system.css",
        "motion": root / "src/app/styles/public-pages-motion.css",
    }
    errors: list[str] = []
    parsed: dict[str, list[CssRule]] = {}
    for key, path in paths.items():
        if not path.is_file():
            errors.append(f"Required CSS file missing: {path.relative_to(root)}")
            continue
        rules, parse_errors = parse_stylesheet(path, key)
        parsed[key] = rules
        errors.extend(parse_errors)

    base_rules = parsed.get("base", [])
    design_rules = parsed.get("design", [])
    motion_rules = parsed.get("motion", [])
    admin_rules = base_rules + design_rules

    def has_selector(
        rules: Iterable[CssRule], fragment: str, *, media: str | None = None
    ) -> bool:
        expected = normalized_selector(fragment)
        for rule in rules:
            if expected not in rule.selector:
                continue
            if media and not any(normalized_space(media).lower() in normalized_space(item).lower() for item in rule.media):
                continue
            return True
        return False

    def declarations_for(
        rules: Iterable[CssRule], selector: str, property_name: str,
        *, media: str | None = None,
    ) -> list[tuple[str, bool]]:
        expected = normalized_selector(selector)
        found: list[tuple[str, bool]] = []
        for rule in rules:
            if expected not in rule.selector:
                continue
            if media and not any(normalized_space(media).lower() in normalized_space(item).lower() for item in rule.media):
                continue
            found.extend(rule.declarations.get(property_name.lower(), []))
        return found

    def has_decl(
        rules: Iterable[CssRule], selector: str, property_name: str, expected_value: str,
        *, important: bool | None = None, media: str | None = None,
    ) -> bool:
        expected = normalized_value(expected_value)
        return any(
            value == expected and (important is None or actual_important is important)
            for value, actual_important in declarations_for(
                rules, selector, property_name, media=media
            )
        )

    def has_any_decl(rules: Iterable[CssRule], selector: str, property_name: str) -> bool:
        return bool(declarations_for(rules, selector, property_name))

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    # Core design tokens: compare parsed custom-property values, not punctuation.
    expected_tokens = {
        "--wajo-color-primary": "#1d5fa7",
        "--wajo-color-ink": "#1b3440",
        "--wajo-color-muted": "#586d76",
        "--wajo-color-canvas": "#f5f7f6",
        "--wajo-color-border": "#d8e2e4",
        "--wajo-content-max": "1480px",
        "--wajo-dashboard-max": "var(--wajo-content-max)",
        "--wajo-form-max": "960px",
        "--wajo-login-max": "448px",
        "--wajo-sidebar-width": "264px",
        "--wajo-radius-control": "0.625rem",
        "--wajo-control-height": "42px",
        "--wajo-button-height": "40px",
        "--wajo-heading-1": "clamp(1.75rem, 2.2vw, 2rem)",
        "--wajo-text-base": "0.9375rem",
        "--wajo-color-success": "#28784f",
        "--wajo-color-danger": "#b33d46",
    }
    for property_name, expected in expected_tokens.items():
        values = [value for rule in admin_rules for value, _ in rule.declarations.get(property_name, [])]
        require(
            normalized_value(expected) in values,
            f"Missing/changed design token {property_name}: expected {expected}.",
        )
    for property_name in ("--wajo-font-sans", "--wajo-font-mono", "--wajo-shadow-sm", "--wajo-heading-2"):
        require(
            any(property_name in rule.declarations for rule in admin_rules),
            f"Required design token {property_name} is missing.",
        )

    # Shell, workspace, dashboard, tables, forms and responsive selectors.
    for selector in (
        ".wajo-admin-topbar__inner", ".wajo-admin-shell", ".wajo-admin-workspace #content",
        ".wajo-admin-workspace .module", ".wajo-admin-workspace .table",
        ".wajo-admin-workspace :where(input.form-control", ".wajo-dashboard__metrics",
        ".wajo-login-frame", ".wajo-login-frame .login-main:has(#field-login)",
        ".wajo-admin-workspace .form-actions", ".wajo-admin-workspace .pagination",
        ".wajo-admin-workspace .page-header .page-heading",
        ".wajo-admin-workspace .table tbody td",
        ".wajo-login-frame .login-main:has(#field-login) .form-control",
        ".wajo-admin-workspace .secondary #user-info",
        ".wajo-admin-workspace .secondary #user-info > .module-content",
        ".secondary #user-info .nums", ".secondary #user-info .info",
        ".wajo-admin-topbar", ".wajo-admin-sidebar", ".wajo-dashboard__metrics",
        ".table tbody tr:hover", ".wajo-datastore__layout", ".wajo-admin-shell .fa",
    ):
        require(has_selector(admin_rules, selector), f"Required CSS selector is missing: {selector}.")

    # Dashboard sizing must remain full width and aligned with the design token.
    require(has_decl(admin_rules, ".wajo-dashboard", "width", "100%"), "Dashboard must remain full width.")
    require(has_decl(admin_rules, ".wajo-dashboard", "max-width", "var(--wajo-dashboard-max)"), "Dashboard must use --wajo-dashboard-max.")

    # Form controls, including the CKAN tag autocomplete, must retain canonical geometry.
    require(has_decl(design_rules, ".wajo-admin-workspace .form-actions .btn.btn-danger", "background", "var(--wajo-color-danger)"), "CKAN delete button must retain its danger background.")
    require(has_decl(design_rules, ".wajo-admin-workspace .form-actions .btn.btn-danger", "color", "#fff"), "CKAN delete button must retain white text.")
    require(has_selector(design_rules, ".wajo-admin-workspace .form-actions .btn:not(.btn-primary):not(.btn-danger)"), "Secondary form action buttons must retain their dedicated styling.")
    require(has_selector(design_rules, ".wajo-admin-workspace .control-group:has(#field-tags) .select2-selection--multiple"), "CKAN Select2 tag chips must retain their wrapper styling.")
    require(has_selector(design_rules, ".chosen-choices"), "Chosen tag autocomplete must retain its styling.")

    tag_selector = ".wajo-admin-workspace :is(#field-tags, [name=\"tag_string\"])"
    for prop, value in (
        ("width", "100%"),
        ("min-height", "var(--wajo-control-height)"),
    ):
        require(has_decl(design_rules, tag_selector, prop, value), f"CKAN keyword field must keep {prop}: {value}.")
    tag_borders = declarations_for(design_rules, tag_selector, "border")
    require(any(value.startswith("1px solid ") for value, _ in tag_borders), "CKAN keyword field must keep one explicit 1px border.")
    require(bool(declarations_for(design_rules, tag_selector, "padding")), "CKAN keyword field must keep explicit padding.")
    require(has_decl(design_rules, tag_selector, "box-shadow", "none"), "CKAN keyword field must not add a second focus ring/shadow.")
    tag_transitions = [value for value, _ in declarations_for(design_rules, tag_selector, "transition")]
    require(any("border-color" in value for value in tag_transitions), "CKAN keyword field must transition its border color.")
    require(
        has_decl(design_rules, ".wajo-admin-workspace .secondary #user-info > .module-content", "padding", "1.15rem", important=True),
        "CKAN profile sidebar content must retain explicit padding.",
    )

    # Login and responsive behavior.
    require(has_selector(base_rules, ".login-main:has(#field-login)"), "Login must target the CKAN 2.12 login wrapper.")
    require(has_selector(base_rules, ".login-wrapper > .login-container"), "Login must retain the native login container layout.")
    require(has_selector(base_rules, ".login-wrapper > .login-form"), "Login must retain the native login form layout.")
    require(has_decl(design_rules, ".wajo-login-frame .login-main:has(#field-login) .form-control", "font-size", "1rem"), "Login input font size must remain readable.")
    require(
        has_decl(base_rules, ".wajo-admin-menu-toggle", "display", "inline-flex", media="(max-width: 991.98px)"),
        "Admin menu toggle must be visible at tablet/mobile widths.",
    )
    require(has_selector(admin_rules, ".wajo-admin-workspace .btn"), "Admin buttons must retain their common component rule.")
    require(has_decl(design_rules, ".wajo-admin-workspace .btn", "min-height", "var(--wajo-button-height)"), "Admin buttons must use canonical button height.")
    require(
        has_decl(design_rules, ".wajo-admin-workspace .btn", "min-height", "44px", media="(max-width: 767.98px)"),
        "Mobile admin buttons must have at least a 44px touch target.",
    )
    require(
        has_decl(design_rules, ".wajo-admin-workspace .pagination .page-link", "min-width", "44px", media="(max-width: 767.98px)"),
        "Mobile pagination must have at least a 44px width.",
    )
    require(
        has_decl(design_rules, ".wajo-admin-workspace .pagination .page-link", "min-height", "44px", media="(max-width: 767.98px)"),
        "Mobile pagination must have at least a 44px height.",
    )

    # Editorial Pages/News form, previews and responsive admin collections.
    for selector in (
        ".wajo-pages-admin-route .wajo-admin-workspace .pages-form",
        ".wajo-pages-editor", ".wajo-md-preview", ".blog-item",
        "module-content > ul:not(.nav):not(.pagination)",
        ".wajo-pages-admin-list-route", ".table-responsive > table tbody td",
        "ul.list-unstyled:not(.nav):not(.pagination)",
    ):
        require(has_selector(design_rules, selector), f"Pages/News admin CSS is missing selector: {selector}.")

    # Native CKAN resource format sprite/status markup must never be overridden.
    resource_overrides = sorted({
        rule.selector for rule in design_rules if ".resource-item" in rule.selector
    })
    require(not resource_overrides, "Do not override CKAN native .resource-item/.format-label selectors: " + "; ".join(resource_overrides))
    require(has_selector(design_rules, ".dataset-resources a.label[data-format]"), "Dataset resource format chips must retain a neutral shared style.")
    geojson_overrides = sorted({rule.selector for rule in design_rules if "geojson" in rule.selector.lower()})
    require(not geojson_overrides, "Do not apply GeoJSON-only badge colors or font overrides: " + "; ".join(geojson_overrides))

    require(has_selector(design_rules, ".wajo-admin-workspace .wajo-admin-cms-page .wajo-cms-actions"), "Pages/Blog detail actions must use a dedicated toolbar.")
    require(has_decl(design_rules, ".wajo-admin-workspace .wajo-admin-cms-page .wajo-cms-actions", "gap", ".625rem"), "Pages/Blog action toolbar needs a consistent button gap.")
    require(has_decl(design_rules, ".wajo-admin-workspace .wajo-admin-cms-page .wajo-cms-actions", "margin", "0 0 1.35rem"), "Pages/Blog action toolbar must separate buttons from the detail heading.")

    # CKAN shell-wide button contrast must be explicit and survive formatter reflow.
    for selector, value in (
        (".wajo-admin-shell .btn-primary", "#176b52"),
        (".wajo-admin-shell .btn-success", "#176b3a"),
        (".wajo-admin-shell .btn-danger", "#b42318"),
        (".wajo-admin-shell .btn-info", "#145b78"),
        (".wajo-admin-shell .btn-dark", "#243b32"),
    ):
        require(has_decl(design_rules, selector, "background-color", value, important=True), f"CKAN shell button {selector} must have an explicit filled background.")
    light_selector = ".wajo-admin-shell :is(.btn-light, .btn-white"
    require(has_selector(design_rules, light_selector), "CKAN shell light/outline buttons need an explicit shell-wide style.")
    require(has_decl(design_rules, light_selector, "background", "#f7faf8", important=True), "CKAN shell light/outline buttons need a readable light background.")
    require(has_decl(design_rules, light_selector, "color", "#29483a", important=True), "CKAN shell light/outline buttons need dark text.")
    require(has_decl(design_rules, light_selector, "-webkit-text-fill-color", "#29483a", important=True), "CKAN shell light/outline buttons need dark text fill for extension overrides.")
    filled_selector = ".wajo-admin-shell :is(.btn-primary, .btn-success, .btn-danger, .btn-info, .btn-dark)"
    require(has_decl(design_rules, filled_selector, "color", "#fff", important=True), "CKAN shell filled buttons need white foreground text.")
    require(has_decl(design_rules, filled_selector, "-webkit-text-fill-color", "#fff", important=True), "CKAN shell filled buttons need white text fill for extension overrides.")

    map_selector = ".wajo-admin-shell .wajo-create-type--geo .wajo-create-type__icon .fa-map-location-dot"
    require(has_selector(design_rules, map_selector), "Geospatial quick action must use Font Awesome map-location-dot.")
    require(has_decl(design_rules, map_selector, "font-size", "1.9rem", important=True), "Geospatial map icon must remain visibly larger than body text.")

    # Public motion: check the parsed easing value and reduced-motion guard.
    require(has_selector(motion_rules, ".organization-directory-card"), "Organization cards must inherit public hover transitions.")
    require(has_selector(motion_rules, ".cms-directory-card"), "CMS cards must inherit public hover transitions.")
    easing_values = [
        value
        for rule in motion_rules
        for value, _important in rule.declarations.get("transition-timing-function", [])
    ]
    easing_expected = normalized_value("cubic-bezier(.2, .7, .2, 1)")
    require(easing_expected in easing_values, "Public item transitions must keep the consistent cubic-bezier easing curve.")
    require(any("@media (prefers-reduced-motion: reduce)" in item.lower() for rule in motion_rules for item in rule.media), "Public hover transitions must respect prefers-reduced-motion.")

    # Remaining shell safety rules are validated from parsed declarations/selectors.
    require(has_selector(base_rules, ":focus-visible"), "Keyboard focus indicator selector is missing.")
    require(not any(value == "fixed" for rule in base_rules for value, _ in rule.declarations.get("position", [])), "Theme must not create a global fixed overlay that covers CKAN controls.")
    require(not has_selector(base_rules, ".wajo-admin-footer__brand img"), "Removed Wajo admin footer brand image styling must not return.")
    require(not has_selector(design_rules, ".wajo-admin-footer"), "Removed Wajo admin footer styling must not return.")
    require(not has_selector(design_rules, ".wajo-admin-sidebar__context"), "Removed Wajo admin sidebar context styling must not return.")
    require(not has_selector(base_rules, ".wajo-icon"), "Custom SVG icon sizing must not replace CKAN Font Awesome icons.")

    if errors:
        print(f"CKAN CSS semantic regression check failed ({len(errors)}):", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("CKAN CSS semantic regression check passed: tokens, selectors, declarations, responsive behavior, button contrast, native resource styling, and public motion validated from parsed CSS.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
