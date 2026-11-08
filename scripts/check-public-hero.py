#!/usr/bin/env python3
"""Check homepage hero geometry, icons, and text contrast from CSS/JSX structure."""
from __future__ import annotations

import re
from pathlib import Path

import tinycss2

ROOT = Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / "src/app/styles/public-home-hero.css"
JSX_PATH = ROOT / "src/app/(public)/page.jsx"
ERRORS: list[str] = []


def require(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


def css_rules(source: str) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for rule in tinycss2.parse_stylesheet(source, skip_whitespace=True, skip_comments=True):
        if rule.type != "qualified-rule":
            continue
        selector = tinycss2.serialize(rule.prelude).strip()
        declarations: dict[str, str] = {}
        for declaration in tinycss2.parse_declaration_list(
            rule.content, skip_whitespace=True, skip_comments=True
        ):
            if declaration.type == "declaration":
                declarations[declaration.lower_name] = tinycss2.serialize(declaration.value).strip()
        result[selector] = declarations
    return result


def relative_luminance(value: str) -> float | None:
    match = re.fullmatch(r"#([0-9a-fA-F]{6})", value.strip())
    if not match:
        return None
    raw = match.group(1)
    channels = [int(raw[index:index + 2], 16) / 255 for index in (0, 2, 4)]

    def linear(channel: float) -> float:
        return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4

    red, green, blue = (linear(channel) for channel in channels)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def contrast_ratio(background: str, foreground: str) -> float | None:
    bg = relative_luminance(background)
    fg = relative_luminance(foreground)
    if bg is None or fg is None:
        return None
    lighter, darker = max(bg, fg), min(bg, fg)
    return (lighter + 0.05) / (darker + 0.05)


css = CSS_PATH.read_text(encoding="utf-8")
jsx = JSX_PATH.read_text(encoding="utf-8")
design_direction = (ROOT / "docs/PANDUAN-PORTAL.md").read_text(encoding="utf-8")
rules = css_rules(css)

hero_visual = rules.get(".home-hero-visual", {})
map_asset = ROOT / "public/illustrations/region-map.svg"
map_asset_text = map_asset.read_text(encoding="utf-8") if map_asset.is_file() else ""
require(hero_visual.get("background") == "transparent" and hero_visual.get("border") == "0"
        and hero_visual.get("box-shadow") == "none",
        "Hero artwork wrapper must remain transparent without a card or background plate.")
require('src={siteConfig.heroMapImage}' in jsx and 'className="home-region-map"' in jsx
        and 'className="home-map-caption"' in jsx,
        "Hero must render the configurable regional map silhouette with a regional caption.")
require("heroMapImage:" in (ROOT / "src/lib/site-config.js").read_text(encoding="utf-8")
        and "NEXT_PUBLIC_HERO_MAP_IMAGE" in (ROOT / "src/lib/site-config.js").read_text(encoding="utf-8"),
        "Regional map artwork must be configurable rather than hard-coded into the tenant identity.")
require("viewBox=\"180 160 720 760\"" in map_asset_text
        and "fill=\"url(#region-land)\"" in map_asset_text
        and "stop-color=\"#EAF1D9\"" in map_asset_text,
        "Regional map asset must be a transparent SVG silhouette with a restrained land palette.")
outline_asset = ROOT / "public/illustrations/region-map-outline.webp"
outline_bytes = outline_asset.read_bytes() if outline_asset.is_file() else b""
example_env = (ROOT / ".env.ckan.example").read_text(encoding="utf-8")
require(outline_bytes[:4] == b"RIFF" and outline_bytes[8:12] == b"WEBP",
        "White regional outline must be shipped as a valid WebP asset.")
require("PORTAL_HERO_MAP_IMAGE=/illustrations/region-map-outline.webp" in example_env,
        "Deployment example must select the white outline map for the homepage hero.")
require("width={1200}" in jsx and "height={1360}" in jsx,
        "Hero map image dimensions must preserve the supplied outline proportions.")
require("home-data-board" not in jsx and "home-data-map-svg" not in jsx
        and "home-atlas-contours" not in jsx and "home-atlas-connections" not in jsx,
        "Generic map panels, fabricated subdivisions, and network-node artwork must not return.")
require("home-map-caption" in jsx and "home-visual-chip" in jsx,
        "The hero should pair a regional map with live statistical shortcuts.")
for selector in (".home-region-map", ".home-map-caption", ".home-visual-chip > svg"):
    require(selector in rules, f"Transparent regional hero needs styling for {selector}.")
for retired_visual in ("home-scene-cube", "home-scene-grid", "home-scene-spark", "home-orbit"):
    require(retired_visual not in jsx, f"Decorative hero element {retired_visual} must not be rendered.")

hero_overlay = rules.get("body:has(.public-home) .home-hero::before", {})
hero_image = rules.get(".home-hero-background img", {})
require("92%" in hero_overlay.get("background-image", ""),
        "Hero copy needs a sufficiently dark overlay for readable white text over the photo.")
require(hero_image.get("object-fit") == "cover" and "47%" in hero_image.get("object-position", ""),
        "Hero background image must fill its reserved frame with a stable focal point.")
require(bool(re.search(r'<Image[\s\S]*?src=\{siteConfig\.heroImage\}[\s\S]*?fill[\s\S]*?preload', jsx)),
        "Homepage hero image must be server-rendered and preloaded for LCP.")
heading = rules.get(".home-hero h1", {})
paragraph = rules.get(".home-hero-description", {})
require(heading.get("color") == "#fff", "Hero heading must retain a high-contrast foreground.")
require("95%" in paragraph.get("color", "") and bool(paragraph.get("text-shadow")),
        "Hero description must retain strong contrast and a subtle text shadow.")

require("background: transparent" in css and "box-shadow: none" in css,
        "Hero artwork wrapper must remain unboxed over the hero photograph.")
for selector in (".home-visual-chip-top-left", ".home-visual-chip-top-right", ".home-visual-chip-bottom-left", ".home-visual-chip-bottom-right"):
    require(selector in rules, f"Floating statistical link must keep its intentional asymmetric position: {selector}.")
metric_colors = [
    rules.get(selector, {}).get("--metric-card-bg")
    for selector in (".home-visual-chip-top-left", ".home-visual-chip-top-right", ".home-visual-chip-bottom-left", ".home-visual-chip-bottom-right")
]
require(len(set(metric_colors)) == 4 and all(metric_colors),
        "Each hero statistic must have its own distinct, saturated card background.")
for color in metric_colors:
    ratio = contrast_ratio(color, "#ffffff") if color else None
    require(ratio is not None and ratio >= 4.5,
            f"Hero card background {color} must provide at least 4.5:1 contrast with white text.")
require("home-visual-chip strong" in css and rules.get(".home-visual-chip strong", {}).get("color") == "#fff",
        "Floating metric values must remain white and legible over saturated cards.")
require("home-map-connectors" in jsx and "home-map-connector" in jsx and "home-map-node" in jsx,
        "Hero statistic cards must connect visually to the regional outline using decorative paths and map nodes.")
require("@keyframes home-metric-float" in css
        and rules.get(".home-visual-chip", {}).get("animation", "").startswith("home-metric-float"),
        "Hero statistic cards must use gentle vertical floating motion.")
require("@media (prefers-reduced-motion: reduce)" in css and "animation: none !important" in css,
        "Hero floating motion must be disabled for reduced-motion users and during loading.")
require("civic data atlas" in design_direction and "standout, modern, clean" in design_direction,
        "Public visual identity must stay specific to a regional data portal and avoid sterile minimalism.")
api_page = (ROOT / "src/app/(public)/api-data/page.jsx").read_text(encoding="utf-8")
component_styles = (ROOT / "src/app/styles/component-styles.css").read_text(encoding="utf-8")
responsive_styles = (ROOT / "src/app/styles/public-responsive.css").read_text(encoding="utf-8")
scroll_manager = (ROOT / "src/components/public-scroll-manager.jsx").read_text(encoding="utf-8")
motion_styles = (ROOT / "src/app/styles/public-pages-motion.css").read_text(encoding="utf-8")
require("api-doc-content" in api_page,
        "API docs content must sit inside a padded panel instead of letting endpoint cards touch the page container.")
require("p-4 shadow-[0_2px_12px" in api_page and "lg:p-8" in api_page,
        "API documentation panel must retain responsive inner spacing at every breakpoint.")
require("home-dataset-art-grid" in jsx and "home-dataset-art-icon" in jsx and "home-dataset-index" in jsx,
        "Dataset preview cards must retain the formal illustrated art panel and sequence marker.")
require("home-data-art" in jsx and "home-format-art" in jsx,
        "The closing two-column service panels must retain their data and resource illustrations.")
require("home-dataset-art-emerald" in component_styles and "home-dataset-art-rose" in component_styles
        and "home-dataset-art-violet" in component_styles and "home-dataset-art-amber" in component_styles,
        "Dataset art must use restrained semantic color variants instead of a single flat color.")
require('.home-topic-card .home-topic-icon[data-category-icon="sprout"]' in component_styles
        and '.home-topic-card .home-topic-icon[data-category-icon="chart"]' in component_styles
        and '.home-topic-card .home-topic-icon[data-category-icon="heart-pulse"]' in component_styles,
        "Category icon color rules must have enough selector specificity to beat the base icon rule.")
require(".home-feature-visualization .home-data-art" in responsive_styles
        and "position: relative;" in responsive_styles
        and ".home-feature-formats .home-format-art" in responsive_styles,
        "Mobile illustrations must flow beneath their copy without overlap.")
require("PUBLIC_HOME_SECTION_SELECTOR" in scroll_manager
        and "is-home-section-visible" in scroll_manager
        and "public-home-section-enter" in motion_styles
        and "prefers-reduced-motion" in motion_styles,
        "Homepage sections must have a subtle one-time reveal that respects reduced-motion.")
require("Energi visual: 2 / 3" in design_direction and "Ritme: 2 / 3" in design_direction and "Gerak: 1 / 3" in design_direction,
        "Public visual direction must document the selected energy, rhythm, and motion dials.")
require(rules.get(".home-visual-metrics", {}).get("pointer-events") == "none",
        "The floating metrics wrapper must not intercept pointer events outside the actual links.")

feature_styles = (ROOT / "src/app/styles/component-styles.css").read_text(encoding="utf-8")
foundation_styles = (ROOT / "src/app/styles/foundation.css").read_text(encoding="utf-8")
require(
    "background: linear-gradient(135deg, #123650 0%, #17445d 100%);" in feature_styles
    and bool(re.search(r"--app-brand-navy:\s*#123650\s*;", foundation_styles)),
    "The data-format feature must retain the shared navy brand surface to prevent a flat all-white page rhythm.",
)
require("hover:-translate-y-0/**/.5" in feature_styles and "hover:shadow-[0_12px_24px" in feature_styles,
        "Category links must retain a restrained interactive depth cue.")

if ERRORS:
    print(f"Public hero visual contract failed ({len(ERRORS)}):")
    for error in ERRORS:
        print(f"- {error}")
    raise SystemExit(1)

print("Public hero visual contract passed: transparent regional map, asymmetric live metrics, no generic network-node artwork, and accessible contrast.")
