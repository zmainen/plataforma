#!/usr/bin/env python3
"""Build the Plataforma static site.

Two page types:
  - index.html: single-scroll landing page
  - docs/*.html: document pages (sidebar nav)

Python stdlib only.
"""
from __future__ import annotations

import html as html_module
import re
import sys
from pathlib import Path

WEB_DIR = Path(__file__).resolve().parent
PROJECT_DIR = WEB_DIR.parent
DOCS_DIR = WEB_DIR / "docs"
IMG_DIR = WEB_DIR / "img"


# ---------------------------------------------------------------------------
# Frontmatter
# ---------------------------------------------------------------------------

_FM_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = _FM_RE.match(text)
    if not m:
        return {}, text
    body_fm, body = m.group(1), m.group(2)
    fm: dict = {}
    current_key: str | None = None
    for raw in body_fm.splitlines():
        if not raw.strip():
            continue
        if raw.startswith("  - ") or raw.startswith("- "):
            stripped = raw.lstrip()[2:].strip()
            if current_key:
                fm.setdefault(current_key, [])
                if isinstance(fm[current_key], list):
                    fm[current_key].append(stripped)
        elif ":" in raw:
            k, _, v = raw.partition(":")
            k = k.strip()
            v = v.strip()
            if v:
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                fm[k] = v
                current_key = k
            else:
                fm[k] = []
                current_key = k
    return fm, body


# ---------------------------------------------------------------------------
# Markdown -> HTML
# ---------------------------------------------------------------------------

_INLINE_PLACEHOLDERS: dict[str, str] = {}


def _inline_protect(match: re.Match) -> str:
    placeholder = f"\x00CODE{len(_INLINE_PLACEHOLDERS)}\x00"
    _INLINE_PLACEHOLDERS[placeholder] = (
        f"<code>{html_module.escape(match.group(1))}</code>"
    )
    return placeholder


def render_inline(text: str) -> str:
    text = html_module.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", _inline_protect, text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)\s]+)\)",
        lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>',
        text,
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![*\w])\*([^*\s][^*]*?)\*(?!\w)", r"<em>\1</em>", text)
    for placeholder, original in _INLINE_PLACEHOLDERS.items():
        text = text.replace(placeholder, original)
    _INLINE_PLACEHOLDERS.clear()
    return text


def _is_table_row(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def _is_table_separator(line: str) -> bool:
    s = line.strip()
    if not (s.startswith("|") and s.endswith("|")):
        return False
    cells = [c.strip() for c in s.strip("|").split("|")]
    return all(re.fullmatch(r":?-+:?", c) for c in cells if c)


def _render_table(lines: list[str]) -> str:
    if len(lines) < 2:
        return ""
    header_cells = [c.strip() for c in lines[0].strip().strip("|").split("|")]
    body_lines = lines[2:]
    rows_html = ["<thead><tr>" +
                 "".join(f"<th>{render_inline(c)}</th>" for c in header_cells) +
                 "</tr></thead>"]
    if body_lines:
        rows_html.append("<tbody>")
        for line in body_lines:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            rows_html.append("<tr>" +
                             "".join(f"<td>{render_inline(c)}</td>" for c in cells) +
                             "</tr>")
        rows_html.append("</tbody>")
    return "<table>" + "".join(rows_html) + "</table>"


def render_markdown(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            i += 1
            code_lines = []
            while i < n and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1
            code_html = html_module.escape("\n".join(code_lines))
            out.append(f"<pre><code>{code_html}</code></pre>")
            continue

        if stripped.startswith("#"):
            m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
            if m:
                level = len(m.group(1))
                inner = render_inline(m.group(2))
                slug = re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")
                out.append(f'<h{level} id="{slug}">{inner}</h{level}>')
                i += 1
                continue

        if re.fullmatch(r"-{3,}", stripped):
            out.append("<hr>")
            i += 1
            continue

        if stripped.startswith(">"):
            quote_lines = []
            while i < n and lines[i].strip().startswith(">"):
                quote_lines.append(re.sub(r"^>\s?", "", lines[i].strip()))
                i += 1
            inner = render_inline(" ".join(quote_lines))
            out.append(f"<blockquote>{inner}</blockquote>")
            continue

        if _is_table_row(line) and i + 1 < n and _is_table_separator(lines[i + 1]):
            tbl_lines = []
            while i < n and _is_table_row(lines[i]):
                tbl_lines.append(lines[i])
                i += 1
            out.append(_render_table(tbl_lines))
            continue

        if re.match(r"^[-*+]\s+", line):
            list_items = []
            while i < n and re.match(r"^[-*+]\s+", lines[i]):
                content = re.sub(r"^[-*+]\s+", "", lines[i])
                while i + 1 < n and lines[i + 1].startswith("  ") and \
                        not re.match(r"^\s*[-*+]\s+", lines[i + 1]):
                    i += 1
                    content += " " + lines[i].strip()
                list_items.append(f"<li>{render_inline(content)}</li>")
                i += 1
            out.append("<ul>" + "".join(list_items) + "</ul>")
            continue

        if re.match(r"^\d+\.\s+", line):
            list_items = []
            while i < n and re.match(r"^\d+\.\s+", lines[i]):
                content = re.sub(r"^\d+\.\s+", "", lines[i])
                while i + 1 < n and lines[i + 1].startswith("  ") and \
                        not re.match(r"^\s*\d+\.\s+", lines[i + 1]):
                    i += 1
                    content += " " + lines[i].strip()
                list_items.append(f"<li>{render_inline(content)}</li>")
                i += 1
            out.append("<ol>" + "".join(list_items) + "</ol>")
            continue

        if not stripped:
            i += 1
            continue

        para_lines = [line]
        i += 1
        while i < n:
            nxt = lines[i]
            if not nxt.strip():
                break
            if nxt.startswith("#") or nxt.startswith("```") or nxt.startswith(">"):
                break
            if re.match(r"^[-*+]\s+", nxt) or re.match(r"^\d+\.\s+", nxt):
                break
            if _is_table_row(nxt):
                break
            if re.fullmatch(r"-{3,}", nxt.strip()):
                break
            para_lines.append(nxt)
            i += 1
        para = " ".join(l.strip() for l in para_lines)
        out.append(f"<p>{render_inline(para)}</p>")

    return "\n".join(out)


# ---------------------------------------------------------------------------
# Clean pass — strip internal references
# ---------------------------------------------------------------------------

def clean_for_web(md: str) -> str:
    """Remove Artsy, Beowolff, and HAAK references from markdown before render."""
    md = re.sub(r'Artsy and similar platforms are marketplaces first',
                'Existing platforms are marketplaces first', md)
    md = re.sub(r'Artsy and similar platforms', 'existing platforms', md)
    return md


# ---------------------------------------------------------------------------
# Document pages (sidebar layout)
# ---------------------------------------------------------------------------

DOC_NAV = [
    ("section", "The landscape"),
    ("01-why-now", "Why now", "01-why-now.html"),
    ("02-what-artists-need", "What artists need", "02-what-artists-need.html"),
    ("03-cooperative-not-platform", "A cooperative, not a platform", "03-cooperative-not-platform.html"),
    ("04-how-it-works", "How it works", "04-how-it-works.html"),
    ("05-where-this-goes", "Where this goes", "05-where-this-goes.html"),
    ("section", "Documents"),
    ("founders-concept-2026-03", "Founders' concept", "founders-concept-2026-03.html"),
    ("technical-extension-2026-05", "Technical extension", "technical-extension-2026-05.html"),
]

BRIEF_NAV = [e for e in DOC_NAV if e[0] not in ("section",
             "founders-concept-2026-03", "technical-extension-2026-05")]


def render_doc_page(title: str, body_html: str, current_slug: str,
                    description: str = "") -> str:
    nav_parts: list[str] = []
    for entry in DOC_NAV:
        if entry[0] == "section":
            nav_parts.append(f'<span class="nav-section">{entry[1]}</span>')
        else:
            slug, label, link = entry
            cls = "current" if slug == current_slug else ""
            nav_parts.append(f'<a href="{link}" class="{cls}">{label}</a>')
    nav = "\n".join(nav_parts)
    full_title = f"{title} — Plataforma"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{html_module.escape(description)}">
<title>{html_module.escape(full_title)}</title>
<link rel="stylesheet" href="../style.css">
</head>
<body class="page-doc">
<aside class="doc-sidebar">
  <div class="brand"><a href="../index.html">Plataforma</a></div>
  <nav>{nav}</nav>
</aside>
<main class="doc-main">
  <article>
    {body_html}
  </article>
</main>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Landing page
# ---------------------------------------------------------------------------

def _find_hero_images() -> list[str]:
    hero_dir = IMG_DIR / "hero"
    if not hero_dir.is_dir():
        return []
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    return sorted(f.name for f in hero_dir.iterdir() if f.suffix.lower() in exts)


def build_index() -> str:
    images = _find_hero_images()
    n = max(len(images), 1)
    cycle = n * 15  # 15 seconds per image, slow morph

    hero_imgs = ""
    for i, img in enumerate(images):
        delay = i * 15
        hero_imgs += (
            f'<img src="img/hero/{img}" alt="" '
            f'style="--total-duration:{cycle}s;--delay:{delay}s">'
        )


    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="A cooperative directory for creative work.">
<title>Plataforma</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<section class="hero">
  <div class="hero-images">{hero_imgs}</div>
  <div class="hero-overlay">
    <h1>Plataforma</h1>
    <p class="sub">A cooperative directory for creative work</p>
  </div>
</section>

<div class="text-block">
  <p>Artists are hard to find. A portfolio site is discoverable only if someone already knows your name. Galleries showcase their own roster. The platforms that exist are marketplaces first &mdash; discovery is a byproduct of selling, not a goal.</p>
  <p>The information that would make discovery possible &mdash; who made what, where it has been shown, which collections hold it &mdash; is scattered across museum databases, gallery spreadsheets, and CV PDFs. No one has assembled it into <span class="highlight">a single, navigable, artist-controlled directory.</span></p>
  <p>We are building one. A cooperative, not a platform. A searchable map of creative production across disciplines &mdash; visual art, music, film, architecture, performance &mdash; built and governed by the artists themselves.</p>
  <p class="attribution">&mdash; Katie Dixon &amp; Okwui Okpokwasili, 2026</p>
</div>

<section class="briefs">
  <h2>The landscape</h2>
  <div class="brief-grid">
    <a href="docs/01-why-now.html" class="brief-card">
      <h3>Why now</h3>
      <p>The organizing moment for artists &mdash; and why cooperative infrastructure is possible to build today.</p>
    </a>
    <a href="docs/02-what-artists-need.html" class="brief-card">
      <h3>What artists need</h3>
      <p>Control over your own record. Professional connection. Collective leverage. None of them are a better app.</p>
    </a>
    <a href="docs/03-cooperative-not-platform.html" class="brief-card">
      <h3>A cooperative, not a platform</h3>
      <p>Why the governance structure is the product &mdash; and what it makes possible that no platform can promise.</p>
    </a>
    <a href="docs/04-how-it-works.html" class="brief-card">
      <h3>How it works</h3>
      <p>Auto-populated catalogs, one persistent identity, and a map of creative relationships that finally exists online.</p>
    </a>
    <a href="docs/05-where-this-goes.html" class="brief-card">
      <h3>Where this goes</h3>
      <p>From a NYC pilot to the professional infrastructure artists never had.</p>
    </a>
  </div>
</section>

<section class="people">
  <h2>Team</h2>
  <div class="person">
    <h3>Katie Dixon</h3>
    <span class="title">Co-founder</span>
    <p>Arts, architecture, urban planning. Socrates Sculpture Park, Powerhouse Arts, BAM, NYC Dept. of Cultural Affairs. BA Yale, MA Columbia.</p>
  </div>
  <div class="person">
    <h3>Okwui Okpokwasili</h3>
    <span class="title">Co-founder</span>
    <p>Performer, choreographer, writer. Bessie Award&ndash;winning <em>Bronx Gothic</em>. 2018 MacArthur Fellow. BA Yale.</p>
  </div>
  <div class="person">
    <h3>Zach Mainen</h3>
    <span class="title">Technical contributor</span>
    <p>Neuroscientist, Champalimaud Foundation. Open-source museum data and identifier resolution.</p>
  </div>
</section>

<div class="rule"><hr></div>


<footer>
  <div class="footer-inner">
    <div>
      <h3>Plataforma</h3>
      <p>A cooperative directory for creative work.</p>
      <p>Artist-owned. Every discipline.</p>
    </div>
    <div>
      <h3>The landscape</h3>
      <p><a href="docs/01-why-now.html">Why now</a></p>
      <p><a href="docs/02-what-artists-need.html">What artists need</a></p>
      <p><a href="docs/03-cooperative-not-platform.html">A cooperative, not a platform</a></p>
      <p><a href="docs/04-how-it-works.html">How it works</a></p>
      <p><a href="docs/05-where-this-goes.html">Where this goes</a></p>
    </div>
    <div>
      <h3>Documents</h3>
      <p><a href="docs/founders-concept-2026-03.html">Founders&rsquo; concept</a></p>
      <p><a href="docs/technical-extension-2026-05.html">Technical extension</a></p>
    </div>
    <div>
      <h3>Contact</h3>
      <p>New York City</p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2026 Plataforma</span>
    <span>K. Dixon &middot; O. Okpokwasili &middot; Z. Mainen</span>
  </div>
</footer>

</body>
</html>
"""


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def slug_from_path(path: Path) -> str:
    return path.stem


def title_from_body(body: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    return m.group(1).strip() if m else fallback


def build_doc(md_path: Path, slug: str) -> str:
    raw = md_path.read_text()
    fm, body = parse_frontmatter(raw)
    body = clean_for_web(body)
    title = title_from_body(body, fm.get("description", slug))
    description = fm.get("description", "")
    body_html = render_markdown(body)
    return render_doc_page(title, body_html, slug, description=description)


def main() -> int:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    BRIEFS_DIR = PROJECT_DIR / "briefs"

    sources = [
        *(sorted(BRIEFS_DIR.glob("*.md")) if BRIEFS_DIR.is_dir() else []),
        PROJECT_DIR / "founders-concept-2026-03.md",
        PROJECT_DIR / "technical-extension-2026-05.md",
    ]
    for src in sources:
        if not src.exists():
            print(f"missing: {src}", file=sys.stderr)
            continue
        slug = slug_from_path(src)
        out = DOCS_DIR / f"{slug}.html"
        out.write_text(build_doc(src, slug))
        print(f"wrote {out.relative_to(WEB_DIR)}")

    out = WEB_DIR / "index.html"
    out.write_text(build_index())
    print(f"wrote {out.relative_to(WEB_DIR)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
