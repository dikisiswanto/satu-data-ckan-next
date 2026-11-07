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
design_direction = (ROOT / "DESIGN.md").read_text(encoding="utf-8")
rules = css_rules(css)

mark = rules.get(".home-visual-mark", {})
require(mark.get("width") == "8rem" and mark.get("height") == "8rem",
        "Hero data mark must reserve a stable square frame.")
require("linear-gradient" in mark.get("background", "") and mark.get("color") == "#163c56",
        "Hero data mark must use a deliberate branded surface with a readable foreground.")
require(bool(re.search(r'<div className="home-visual-mark"[^>]*>\s*<span className="home-visual-mark-icon">\s*<Database', jsx)),
        "Hero visual must use a clearly framed database identity mark.")
require("home-atlas-contours" in jsx and "home-atlas-connections" in jsx and "home-atlas-nodes" in jsx,
        "Hero must include the purposeful atlas/network motif used to express connected regional data.")
for selector in (".home-atlas-contours path", ".home-atlas-connections path", ".home-atlas-nodes circle"):
    require(selector in rules, f"Atlas/network motif must define a visual treatment for {selector}.")
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

palette_match = re.search(
    r"\.home-visual-chip-top-left,\s*\.home-visual-chip-top-right,\s*\.home-visual-chip-bottom-left,\s*\.home-visual-chip-bottom-right\s*\{([^}]+)\}",
    css,
    re.DOTALL,
)
palette_declarations = {}
if palette_match:
    for declaration in tinycss2.parse_declaration_list(
        palette_match.group(1), skip_whitespace=True, skip_comments=True
    ):
        if declaration.type == "declaration":
            palette_declarations[declaration.lower_name] = tinycss2.serialize(declaration.value).strip()
background = palette_declarations.get("--chip-bg", "")
ink = palette_declarations.get("--chip-ink", "")
muted = palette_declarations.get("--chip-muted", "")
require(bool(background and ink and muted), "Floating metric links must share one defined accent palette.")
for text_color, text_kind in ((ink, "title"), (muted, "description")):
    ratio = contrast_ratio(background, text_color)
    require(ratio is not None and ratio >= 4.5,
            f"Floating metric {text_kind} contrast must be at least 4.5:1.")
require("animation: none !important" in css and palette_match is not None,
        "Hero motion must remain static and metric links must share a deliberate palette.")
for selector in (".home-visual-chip-top-left", ".home-visual-chip-top-right", ".home-visual-chip-bottom-left", ".home-visual-chip-bottom-right"):
    declarations = rules.get(selector, {})
    chip_background = declarations.get("--chip-bg", "").strip()
    for key in ("--chip-ink", "--chip-muted"):
        chip_color = declarations.get(key, "").strip()
        ratio = contrast_ratio(chip_background, chip_color) if chip_background and chip_color else None
        require(ratio is not None and ratio >= 4.5,
                f"{selector} must preserve WCAG AA contrast for {key}.")
require("civic data atlas" in design_direction and "standout, modern, clean" in design_direction,
        "Public visual identity must stay specific to a regional data portal and avoid sterile minimalism.")
require("ENERGY: **2 / 3**" in design_direction and "RHYTHM: **2 / 3**" in design_direction and "MOTION: **1 / 3**" in design_direction,
        "Public visual direction must document the selected energy, rhythm, and motion dials.")
require(rules.get(".home-atlas-visual", {}).get("pointer-events", "").strip() == "none",
        "The abstract atlas/network motif must remain non-interactive and not intercept controls.")

feature_styles = (ROOT / "src/app/styles/component-styles.css").read_text(encoding="utf-8")
require("background: #173d57;" in feature_styles,
        "The data-format feature must retain a distinct navy surface to prevent a flat all-white page rhythm.")
require("hover:-translate-y-0/**/.5" in feature_styles and "hover:shadow-[0_12px_24px" in feature_styles,
        "Category links must retain a restrained interactive depth cue.")

if ERRORS:
    print(f"Public hero visual contract failed ({len(ERRORS)}):")
    for error in ERRORS:
        print(f"- {error}")
    raise SystemExit(1)

print("Public hero visual contract passed: branded atlas/network motif, no generic 3D/grid/orbit artwork, dark image overlay, semantic metric palettes, and WCAG AA text contrast.")
