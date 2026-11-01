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
rules = css_rules(css)

cube = rules.get(".home-scene-cube", {})
require(cube.get("width") == "var(--cube-size)" and cube.get("height") == "var(--cube-size)",
        "The 3D cube must use one shared width/height dimension.")
face = rules.get(".home-scene-cube__face", {})
require(face.get("width") == "var(--cube-size)" and face.get("height") == "var(--cube-size)",
        "Every cube face must use the exact cube dimensions.")
require(face.get("box-sizing") == "border-box" and face.get("border-radius") == "0",
        "Cube faces must meet edge-to-edge without rounded transparent gaps.")
size_value = cube.get("--cube-size", "")
half_value = cube.get("--cube-half", "")
size_match = re.fullmatch(r"([0-9.]+)rem", size_value)
half_match = re.fullmatch(r"([0-9.]+)rem", half_value)
require(bool(size_match and half_match and abs(float(size_match.group(1)) / 2 - float(half_match.group(1))) < 0.0001),
        "Cube depth must equal exactly half of its square face dimension.")

faces = {
    "front": "Database",
    "back": "BarChart3",
    "right": "MapPinned",
    "left": "Network",
    "top": "FileText",
    "bottom": "FileChartColumn",
}
for side, icon in faces.items():
    selector = f".home-scene-cube__{side}"
    declarations = rules.get(selector, {})
    require(bool(declarations.get("background")), f"Cube {side} face needs an opaque surface fill.")
    require(bool(declarations.get("color")), f"Cube {side} face needs a deliberate icon color.")
    require("translateZ(var(--cube-half))" in declarations.get("transform", ""),
            f"Cube {side} face must use the same half-size depth as every other face.")
    span_pattern = re.compile(
        rf'<span className="home-scene-cube__face home-scene-cube__{side}"[^>]*>(.*?)</span>',
        re.DOTALL,
    )
    match = span_pattern.search(jsx)
    require(bool(match), f"Cube {side} face markup is missing.")
    if match:
        require(bool(re.search(rf'<{icon}(?:\s|>)', match.group(1))),
                f"Cube {side} face must display its {icon} icon.")

hero = rules.get("body:has(.public-home) .home-hero", {})
require("92%" in hero.get("background-image", ""),
        "Hero copy needs a sufficiently dark overlay for readable white text over the photo.")
heading = rules.get(".home-hero h1", {})
paragraph = rules.get(".home-hero-description", {})
require(heading.get("color") == "#fff", "Hero heading must retain a high-contrast foreground.")
require("95%" in paragraph.get("color", "") and bool(paragraph.get("text-shadow")),
        "Hero description must retain strong contrast and a subtle text shadow.")

chip_tones = {
    ".home-visual-chip-top-left": "blue",
    ".home-visual-chip-top-right": "green",
    ".home-visual-chip-bottom-left": "violet",
    ".home-visual-chip-bottom-right": "amber",
}
seen_backgrounds: set[str] = set()
for selector, label in chip_tones.items():
    declarations = rules.get(selector, {})
    background = declarations.get("--chip-bg", "")
    ink = declarations.get("--chip-ink", "")
    muted = declarations.get("--chip-muted", "")
    require(bool(background and ink and muted), f"The {label} floating metric card needs its own background and text palette.")
    require(background not in seen_backgrounds, "Floating metric cards must use distinct soft background colors.")
    seen_backgrounds.add(background)
    for text_color, text_kind in ((ink, "title"), (muted, "description")):
        ratio = contrast_ratio(background, text_color)
        require(ratio is not None and ratio >= 4.5,
                f"The {label} floating card {text_kind} contrast must be at least 4.5:1.")

if ERRORS:
    print(f"Public hero visual contract failed ({len(ERRORS)}):")
    for error in ERRORS:
        print(f"- {error}")
    raise SystemExit(1)

print("Public hero visual contract passed: six icon faces, exact cube geometry, dark image overlay, distinct card palettes, and WCAG AA text contrast.")
