import io
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy.orm import Session

from backend.models import ActionProposal, Product, Supermarket

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
LOGO_CANDIDATES = [
    ROOT_DIR / "frontend" / "public" / "zerospoil-logo.png",
    ROOT_DIR / "assets" / "zerospoil_logo.png",
    ROOT_DIR / "assets" / "zerospoil_logo.jpg",
]


def _fetch_manifest_rows(db: Session) -> List[Tuple[ActionProposal, Supermarket, Product]]:
    return (
        db.query(ActionProposal, Supermarket, Product)
        .join(Supermarket, ActionProposal.supermarket_id == Supermarket.id)
        .join(Product, ActionProposal.product_id == Product.id)
        .order_by(ActionProposal.id.asc())
        .all()
    )


def generate_dispatch_excel(db: Session) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Dhaka Dispatch Manifest"

    # Title banner
    ws.merge_cells("A1:J1")
    ws["A1"] = "ZeroSpoil B2B Cold-Chain Dispatch Manifest — Dhaka Hub [SYNTHETIC]"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    ws["A1"].fill = PatternFill(start_color="14532D", end_color="14532D", fill_type="solid")
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 26

    headers = [
        "Proposal ID",
        "Action",
        "Supermarket",
        "Route Corridor",
        "Product SKU",
        "Qty (kg)",
        "Markdown (%)",
        "Truck ID",
        "Driver",
        "Approval Status",
    ]
    ws.append(headers)
    header_fill = PatternFill(start_color="E7F6EC", end_color="E7F6EC", fill_type="solid")
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=2, column=col_idx)
        cell.font = Font(bold=True, color="14532D")
        cell.fill = header_fill

    rows = _fetch_manifest_rows(db)
    for prop, store, prod in rows:
        ws.append(
            [
                prop.proposal_code,
                prop.action_type,
                store.name,
                prop.route_corridor or store.route_corridor,
                prod.name,
                round(prop.recommended_qty_kg, 1),
                prop.discount_pct,
                prop.truck_id or "TBD-REEFER",
                prop.driver_name or "Assigned at Hub",
                prop.status,
            ]
        )

    widths = [16, 12, 24, 28, 28, 12, 14, 15, 18, 16]
    for i, w in enumerate(widths, start=1):
        col_letter = chr(64 + i)
        ws.column_dimensions[col_letter].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


def generate_dispatch_pdf(db: Session) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    story = []

    # Official ZeroSpoil Master Logo stamp
    logo_path = next((p for p in LOGO_CANDIDATES if p.exists()), None)
    if logo_path is not None:
        story.append(RLImage(str(logo_path), width=58 * mm, height=21 * mm, kind="proportional"))
        story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("<b>ZeroSpoil — Dhaka B2B Cold-Chain Driver Route Manifest</b>", styles["Title"]))
    story.append(
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} | "
            "Dispatcher: Kabir Hossain (Pran Logistics Hub) | Tag: [SYNTHETIC]",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 5 * mm))

    table_data = [["Code", "Store & Corridor", "Product", "Qty (kg)", "Truck / Driver", "Status"]]
    rows = _fetch_manifest_rows(db)
    total_qty = 0.0
    total_savings = 0.0
    for prop, store, prod in rows:
        total_qty += prop.recommended_qty_kg
        total_savings += prop.projected_savings_bdt
        table_data.append(
            [
                prop.proposal_code,
                f"{store.name}\n({prop.route_corridor or store.route_corridor})",
                prod.name,
                f"{prop.recommended_qty_kg:.1f}",
                f"{prop.truck_id or 'DM-T-11-4021'}\n{prop.driver_name or 'Hub Driver'}",
                prop.status,
            ]
        )

    tbl = Table(table_data, colWidths=[26 * mm, 46 * mm, 42 * mm, 16 * mm, 32 * mm, 20 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14532D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6D3D1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FAF8F5"), colors.white]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            f"<b>Summary:</b> {len(rows)} operational directives | Total Volume: {total_qty:.1f} kg | "
            f"Projected Capital Saved: BDT {total_savings:,.0f} | Governance: M-09 Human-in-the-Loop Enforced.",
            styles["Normal"],
        )
    )

    doc.build(story)
    buf.seek(0)
    return buf.getvalue()