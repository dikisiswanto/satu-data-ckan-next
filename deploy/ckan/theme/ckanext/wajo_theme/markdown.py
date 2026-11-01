"""Safe Markdown renderer shared by CKAN Pages and Blog detail templates.

CKAN Pages stores Markdown source in the database. The pinned upstream detail
views treat every truthy editor setting as WYSIWYG HTML, so the explicit
``markdown`` value is incorrectly emitted as plain text. This renderer keeps
raw HTML disabled while adding the GitHub-style constructs used by the public
portal: tables, fenced code, task lists and strikethrough.
"""
from __future__ import annotations

import re
from typing import Any
from xml.etree import ElementTree as etree

import markdown as markdown_library
import nh3
from markdown.extensions import Extension
from markdown.inlinepatterns import InlineProcessor
from markdown.treeprocessors import Treeprocessor
from markupsafe import Markup

try:
    from ckan.lib import helpers as ckan_helpers
except ImportError:  # Allows static tooling to import this module outside CKAN.
    ckan_helpers = None


# CKAN's own Markdown helper uses this expression to remove raw HTML when
# ckanext.pages.allow_html is false. Reuse it when available; keep a narrow
# fallback for isolated renderer tests.
_RAW_HTML_FALLBACK = re.compile(r"</?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*?)?\s*/?>|<!--.*?-->", re.DOTALL)
_DANGEROUS_RAW_ELEMENTS = re.compile(
    r"<(script|style|iframe|object|embed|svg|math)\b[^>]*>.*?</\1\s*>", re.IGNORECASE | re.DOTALL
)
_FENCED_CODE_BLOCK = re.compile(
    r"(?m)^ {0,3}(?P<fence>`{3,}|~{3,})[^\n]*\n.*?^ {0,3}(?P=fence)[`~]*[ \t]*(?:\n|$)",
    re.DOTALL,
)
_INLINE_CODE_SPAN = re.compile(r"(?<!`)(?P<fence>`+)(?!`)(?P<code>.*?)(?<!`)\1(?!`)", re.DOTALL)
_STRIKE_RE = re.compile(r"(?<!\\)~~(.+?)(?<!\\)~~", re.DOTALL)
_INLINE_EMPHASIS_RE = re.compile(
    r"(\*\*[^*\n]+\*\*|__[^_\n]+__|(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_))"
)

_ALLOWED_TAGS = {
    "a", "abbr", "blockquote", "br", "code", "del", "dd", "dl", "dt",
    "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "input",
    "li", "ol", "p", "pre", "span", "strong", "sub", "sup", "table",
    "tbody", "td", "th", "thead", "tr", "ul",
}
_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "rel"},
    "img": {"src", "alt", "title", "width", "height"},
    "input": {"type", "checked", "disabled", "aria-label"},
    "li": {"class"},
    "ol": {"start"},
    "pre": {"class"},
    "code": {"class"},
    "td": {"align", "colspan", "rowspan"},
    "th": {"align", "colspan", "rowspan"},
    "ul": {"class"},
}
_ALLOWED_URL_SCHEMES = {"http", "https", "mailto"}


def _append_simple_emphasis(parent: etree.Element, value: str) -> None:
    """Preserve strong/emphasis nested inside a strikethrough span."""
    cursor = 0
    for match in _INLINE_EMPHASIS_RE.finditer(value):
        if match.start() > cursor:
            if len(parent):
                parent[-1].tail = (parent[-1].tail or "") + value[cursor:match.start()]
            else:
                parent.text = (parent.text or "") + value[cursor:match.start()]
        token = match.group(0)
        if token.startswith(("**", "__")):
            element = etree.SubElement(parent, "strong")
            element.text = token[2:-2]
        else:
            element = etree.SubElement(parent, "em")
            element.text = token[1:-1]
        cursor = match.end()
    if cursor < len(value):
        if len(parent):
            parent[-1].tail = (parent[-1].tail or "") + value[cursor:]
        else:
            parent.text = (parent.text or "") + value[cursor:]


class _StrikethroughProcessor(InlineProcessor):
    def handleMatch(self, match: re.Match[str], data: str) -> tuple[etree.Element, int, int]:  # noqa: N802
        element = etree.Element("del")
        _append_simple_emphasis(element, match.group(1))
        return element, match.start(0), match.end(0)


class _TaskListTreeprocessor(Treeprocessor):
    def run(self, root: etree.Element) -> etree.Element:
        for item in root.iter("li"):
            container = item
            # Python-Markdown wraps loose list-item content in a paragraph.
            if not (container.text or "").strip() and len(container) and container[0].tag == "p":
                container = container[0]
            value = container.text or ""
            match = re.match(r"^\s*\[([ xX])\]\s+", value)
            if not match:
                continue

            checked = match.group(1).lower() == "x"
            container.text = value[match.end():]
            checkbox = etree.Element("input", {
                "type": "checkbox",
                "disabled": "disabled",
                "aria-label": "Tugas selesai" if checked else "Tugas belum selesai",
            })
            if checked:
                checkbox.set("checked", "checked")
            checkbox.tail = " "
            container.insert(0, checkbox)
            classes = (item.get("class") or "").split()
            if "task-list-item" not in classes:
                classes.append("task-list-item")
            item.set("class", " ".join(classes))
        return root


class _WajoMarkdownExtension(Extension):
    def extendMarkdown(self, md: markdown_library.Markdown) -> None:  # noqa: N802
        md.inlinePatterns.register(_StrikethroughProcessor(_STRIKE_RE), "wajo_strikethrough", 75)
        md.treeprocessors.register(_TaskListTreeprocessor(md), "wajo_task_lists", 15)


def _remove_raw_html(source: str) -> str:
    """Remove raw HTML outside code spans while preserving literal code samples.

    CKAN's Markdown policy disables author-supplied HTML. A naive tag regex also
    strips examples inside fenced/inline code, so protect those spans before
    removing HTML and restore them before Python-Markdown parses the source.
    Dangerous raw elements are removed with their contents, while the final
    nh3 pass remains the output safety boundary.
    """
    protected: list[str] = []

    def protect(match: re.Match[str]) -> str:
        token = f"WAJOMARKDOWNPROTECTEDCODE{len(protected):04d}TOKEN"
        protected.append(match.group(0))
        return token

    cleaned_source = source.strip()
    cleaned_source = _FENCED_CODE_BLOCK.sub(protect, cleaned_source)
    cleaned_source = _INLINE_CODE_SPAN.sub(protect, cleaned_source)
    cleaned_source = _DANGEROUS_RAW_ELEMENTS.sub("", cleaned_source)

    pattern: Any = getattr(ckan_helpers, "RE_MD_HTML_TAGS", None) if ckan_helpers else None
    if pattern is not None and hasattr(pattern, "sub"):
        cleaned_source = pattern.sub("", cleaned_source)
    else:
        cleaned_source = _RAW_HTML_FALLBACK.sub("", cleaned_source)

    for index, literal in enumerate(protected):
        cleaned_source = cleaned_source.replace(f"WAJOMARKDOWNPROTECTEDCODE{index:04d}TOKEN", literal)
    return cleaned_source


def render_wajo_markdown(content: Any) -> Markup:
    """Render safe CKAN editorial Markdown with tables, code, tasks and del tags."""
    if not isinstance(content, str) or not content.strip():
        return Markup("")

    source = _remove_raw_html(content)
    rendered = markdown_library.markdown(
        source,
        extensions=["extra", "sane_lists", _WajoMarkdownExtension()],
        output_format="html5",
    )
    cleaned = nh3.clean(
        rendered,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        url_schemes=_ALLOWED_URL_SCHEMES,
        strip_comments=True,
    )
    return Markup(cleaned)
