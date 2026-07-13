#!/usr/bin/env python3
"""Generate the complete Czech Vystaveno user manual as a styled PDF."""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#667085")
CORAL = colors.HexColor("#F26B5B")
CORAL_DARK = colors.HexColor("#C74336")
CORAL_SOFT = colors.HexColor("#FFF1EE")
TEAL = colors.HexColor("#0F766E")
TEAL_SOFT = colors.HexColor("#EAF8F6")
LINE = colors.HexColor("#E4E7EC")
PAPER = colors.HexColor("#FCFCFA")


def register_fonts() -> None:
    font_root = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("ManualSans", str(font_root / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("ManualSans-Bold", str(font_root / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("ManualSans-Italic", str(font_root / "Arial Italic.ttf")))
    pdfmetrics.registerFont(
        TTFont("ManualSans-BoldItalic", str(font_root / "Arial Bold Italic.ttf"))
    )
    pdfmetrics.registerFontFamily(
        "ManualSans",
        normal="ManualSans",
        bold="ManualSans-Bold",
        italic="ManualSans-Italic",
        boldItalic="ManualSans-BoldItalic",
    )


def inline_markup(value: str) -> str:
    escaped = html.escape(value.strip())
    escaped = re.sub(r"`([^`]+)`", r'<font name="ManualSans-Bold">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", escaped)
    return escaped


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ManualBody",
            parent=styles["BodyText"],
            fontName="ManualSans",
            fontSize=9.3,
            leading=13.2,
            textColor=INK,
            spaceAfter=5,
            allowWidows=0,
            allowOrphans=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualH1",
            parent=styles["Heading1"],
            fontName="ManualSans-Bold",
            fontSize=21,
            leading=25,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=10,
            keepWithNext=True,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualH2",
            parent=styles["Heading2"],
            fontName="ManualSans-Bold",
            fontSize=15,
            leading=19,
            textColor=CORAL_DARK,
            spaceBefore=13,
            spaceAfter=7,
            keepWithNext=True,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualH3",
            parent=styles["Heading3"],
            fontName="ManualSans-Bold",
            fontSize=11.2,
            leading=14,
            textColor=TEAL,
            spaceBefore=9,
            spaceAfter=4,
            keepWithNext=True,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualH4",
            parent=styles["Heading4"],
            fontName="ManualSans-Bold",
            fontSize=9.6,
            leading=12.4,
            textColor=INK,
            spaceBefore=7,
            spaceAfter=3,
            keepWithNext=True,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualBullet",
            parent=styles["ManualBody"],
            leftIndent=12,
            firstLineIndent=-7,
            bulletIndent=2,
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualNumber",
            parent=styles["ManualBody"],
            leftIndent=15,
            firstLineIndent=-11,
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ManualCallout",
            parent=styles["ManualBody"],
            leftIndent=7,
            rightIndent=7,
            borderColor=CORAL,
            borderWidth=0.8,
            borderPadding=8,
            backColor=CORAL_SOFT,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=styles["Title"],
            fontName="ManualSans-Bold",
            fontSize=36,
            leading=40,
            textColor=INK,
            alignment=TA_LEFT,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSubtitle",
            parent=styles["Normal"],
            fontName="ManualSans-Bold",
            fontSize=19,
            leading=24,
            textColor=CORAL_DARK,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverMeta",
            parent=styles["Normal"],
            fontName="ManualSans",
            fontSize=10,
            leading=15,
            textColor=MUTED,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            parent=styles["ManualBody"],
            fontSize=7.7,
            leading=10.2,
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHead",
            parent=styles["TableCell"],
            fontName="ManualSans-Bold",
            textColor=colors.white,
            alignment=TA_LEFT,
        )
    )
    return styles


class ManualDocTemplate(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style_name = flowable.style.name
            # Keep the printed TOC concise: chapters and numbered subsections are useful for
            # navigation, while every small example heading made a nearly empty spill page.
            if style_name in {"ManualH1", "ManualH2"}:
                level = {"ManualH1": 0, "ManualH2": 1}[style_name]
                text = flowable.getPlainText()
                key = f"heading-{self.seq.nextf('heading')}"
                self.canv.bookmarkPage(key)
                if level <= 1:
                    self.canv.addOutlineEntry(text, key, level=level, closed=False)
                self.notify("TOCEntry", (level, text, self.page, key))


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page == 1:
        canvas.setFillColor(CORAL)
        canvas.roundRect(width - 63 * mm, height - 50 * mm, 43 * mm, 9 * mm, 4.5 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("ManualSans-Bold", 8)
        canvas.drawCentredString(width - 41.5 * mm, height - 46.7 * mm, "PROVOZNÍ PŘÍRUČKA")
    else:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, height - 14 * mm, width - 18 * mm, height - 14 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("ManualSans", 7.5)
        canvas.drawString(18 * mm, height - 10.5 * mm, "VYSTAVENO · KOMPLETNÍ UŽIVATELSKÝ MANUÁL")
        canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
        canvas.drawString(18 * mm, 9.5 * mm, "Červenec 2026")
        canvas.drawRightString(width - 18 * mm, 9.5 * mm, f"Strana {doc.page}")
    canvas.restoreState()


def table_flowable(rows, styles, available_width):
    cells = []
    for row_index, row in enumerate(rows):
        style = styles["TableHead"] if row_index == 0 else styles["TableCell"]
        cells.append([Paragraph(inline_markup(cell), style) for cell in row])
    col_count = max(len(row) for row in rows)
    widths = [available_width / col_count] * col_count
    table = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), PAPER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def parse_markdown(lines, styles, available_width):
    story = []
    paragraph_buffer = []
    table_rows = []

    def flush_paragraph():
        if paragraph_buffer:
            text = " ".join(part.strip() for part in paragraph_buffer)
            story.append(Paragraph(inline_markup(text), styles["ManualBody"]))
            paragraph_buffer.clear()

    def flush_table():
        if table_rows:
            usable = [row for index, row in enumerate(table_rows) if index != 1]
            story.append(table_flowable(usable, styles, available_width))
            story.append(Spacer(1, 6))
            table_rows.clear()

    for raw in lines:
        line = raw.rstrip()
        if line == "<!-- pagebreak -->":
            flush_paragraph()
            flush_table()
            story.append(PageBreak())
            continue
        if line.startswith("|") and line.endswith("|"):
            flush_paragraph()
            table_rows.append([cell.strip() for cell in line.strip("|").split("|")])
            continue
        flush_table()
        if not line.strip():
            flush_paragraph()
            continue
        if line == "---":
            flush_paragraph()
            story.append(HRFlowable(width="100%", color=LINE, thickness=0.7, spaceBefore=6, spaceAfter=8))
            continue
        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            story.append(Paragraph(inline_markup(heading.group(2)), styles[f"ManualH{level}"]))
            continue
        if line.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), styles["ManualCallout"]))
            continue
        bullet = re.match(r"^-\s+(.+)$", line)
        if bullet:
            flush_paragraph()
            story.append(
                Paragraph(f"•&nbsp;&nbsp;{inline_markup(bullet.group(1))}", styles["ManualBullet"])
            )
            continue
        numbered = re.match(r"^(\d+)\.\s+(.+)$", line)
        if numbered:
            flush_paragraph()
            story.append(
                Paragraph(
                    f"{numbered.group(1)}.&nbsp;&nbsp;{inline_markup(numbered.group(2))}",
                    styles["ManualNumber"],
                )
            )
            continue
        paragraph_buffer.append(line)

    flush_paragraph()
    flush_table()
    return story


def cover_story(styles):
    return [
        Spacer(1, 55 * mm),
        Paragraph("Vystaveno", styles["CoverTitle"]),
        Spacer(1, 4 * mm),
        Paragraph("Kompletní uživatelský manuál", styles["CoverSubtitle"]),
        Spacer(1, 8 * mm),
        HRFlowable(width="45%", color=CORAL, thickness=3, hAlign="LEFT"),
        Spacer(1, 10 * mm),
        Paragraph(
            "Pro restaurace, kavárny, bary, obchody, služby a zakázkový provoz.",
            styles["CoverMeta"],
        ),
        Spacer(1, 3 * mm),
        Paragraph(
            "Návod k dotykové obsluze, stolům, kuchyni, skladu, financím, týmu a celé správě aplikace.",
            styles["CoverMeta"],
        ),
        Spacer(1, 28 * mm),
        Table(
            [
                [
                    Paragraph("RYCHLÉ OVLÁDÁNÍ", styles["TableHead"]),
                    Paragraph("VOLBY K PRODUKTŮM", styles["TableHead"]),
                    Paragraph("PROVOZNÍ POSTUPY", styles["TableHead"]),
                ]
            ],
            colWidths=[52 * mm] * 3,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), TEAL),
                    ("BOX", (0, 0), (-1, -1), 0, TEAL),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                    ("LINEAFTER", (0, 0), (-2, -1), 1, colors.white),
                ]
            ),
        ),
        Spacer(1, 20 * mm),
        Paragraph("Verze příručky: červenec 2026", styles["CoverMeta"]),
    ]


def generate(source: Path, output: Path) -> None:
    register_fonts()
    styles = build_styles()
    output.parent.mkdir(parents=True, exist_ok=True)

    left = right = 18 * mm
    top = 19 * mm
    bottom = 19 * mm
    doc = ManualDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=left,
        rightMargin=right,
        topMargin=top,
        bottomMargin=bottom,
        title="Vystaveno — Kompletní uživatelský manuál",
        author="Vystaveno",
        subject="Uživatelský manuál aplikace Vystaveno",
    )
    frame = Frame(left, bottom, A4[0] - left - right, A4[1] - top - bottom, id="manual")
    doc.addPageTemplates([PageTemplate(id="manual", frames=[frame], onPage=page_decor)])

    raw_lines = source.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(raw_lines) if line.strip() == "### Jak příručku používat")

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            name="TOC1",
            fontName="ManualSans-Bold",
            fontSize=10,
            leading=14,
            leftIndent=0,
            firstLineIndent=0,
            textColor=INK,
            spaceBefore=4,
        ),
        ParagraphStyle(
            name="TOC2",
            fontName="ManualSans",
            fontSize=8.4,
            leading=11.5,
            leftIndent=10,
            firstLineIndent=0,
            textColor=MUTED,
        ),
        ParagraphStyle(
            name="TOC3",
            fontName="ManualSans",
            fontSize=7.5,
            leading=10,
            leftIndent=22,
            firstLineIndent=0,
            textColor=MUTED,
        ),
    ]

    available_width = A4[0] - left - right
    story = cover_story(styles)
    story.extend(
        [
            PageBreak(),
            Paragraph("Obsah", styles["ManualH1"]),
            Paragraph(
                "Klikací záložky v PDF vedou k hlavním kapitolám. Čísla stran se doplní automaticky.",
                styles["ManualBody"],
            ),
            Spacer(1, 4 * mm),
            toc,
            PageBreak(),
        ]
    )
    story.extend(parse_markdown(raw_lines[start:], styles, available_width))
    doc.multiBuild(story)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    generate(args.source.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
