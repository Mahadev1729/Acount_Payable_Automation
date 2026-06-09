"""
Payment Advice PDF Generator
Uses ReportLab to generate professional payment advice documents
"""
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_payment_advice_pdf(payment):
    """
    Generate a professional Payment Advice PDF.
    Returns BytesIO buffer containing the PDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ─── Header ──────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Title'],
        fontSize=18,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        spaceAfter=2,
    )
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#374151'))
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#111827'), fontName='Helvetica-Bold')

    story.append(Paragraph("AP AUTOMATION SYSTEM", title_style))
    story.append(Paragraph("PAYMENT ADVICE", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1e40af')))
    story.append(Spacer(1, 0.3 * inch))

    # ─── Payment Details Table ────────────────────────────────────────────────
    invoice = payment.invoice
    vendor = payment.vendor

    info_data = [
        ['Payment Reference:', payment.payment_id, 'Date:', str(payment.payment_date or 'N/A')],
        ['Invoice Number:', invoice.invoice_number if invoice else 'N/A', 'Invoice Date:', str(invoice.invoice_date if invoice else 'N/A')],
        ['Payment Mode:', payment.get_payment_mode_display(), 'Status:', payment.get_status_display()],
        ['Bank Reference:', payment.bank_reference or 'N/A', 'Currency:', payment.currency],
    ]

    info_table = Table(info_data, colWidths=[3.5 * cm, 7 * cm, 3.5 * cm, 7 * cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#111827')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#f9fafb'), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(info_table)
    story.append(Spacer(1, 0.3 * inch))

    # ─── Vendor Details ───────────────────────────────────────────────────────
    story.append(Paragraph("BENEFICIARY DETAILS", ParagraphStyle('SectionHead', parent=styles['Normal'],
                                                                   fontSize=11, fontName='Helvetica-Bold',
                                                                   textColor=colors.HexColor('#1e40af'),
                                                                   spaceAfter=6)))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dbeafe')))
    story.append(Spacer(1, 0.1 * inch))

    vendor_data = [
        ['Vendor Name:', vendor.vendor_name if vendor else 'N/A'],
        ['Company:', vendor.company_name if vendor else 'N/A'],
        ['GSTIN:', vendor.gstin if vendor else 'N/A'],
        ['Bank Name:', payment.bank_name or (vendor.bank_name if vendor else 'N/A')],
        ['Account Number:', payment.account_number or (vendor.account_number if vendor else 'N/A')],
        ['IFSC Code:', payment.ifsc_code or (vendor.ifsc_code if vendor else 'N/A')],
    ]

    vendor_table = Table(vendor_data, colWidths=[4 * cm, 13 * cm])
    vendor_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#f9fafb'), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(vendor_table)
    story.append(Spacer(1, 0.3 * inch))

    # ─── Amount Box ──────────────────────────────────────────────────────────
    amount_style = ParagraphStyle('Amount', parent=styles['Normal'], fontSize=20,
                                   fontName='Helvetica-Bold', textColor=colors.HexColor('#1e40af'),
                                   alignment=TA_CENTER)
    amount_label_style = ParagraphStyle('AmountLabel', parent=styles['Normal'], fontSize=10,
                                         textColor=colors.HexColor('#6b7280'), alignment=TA_CENTER)

    amount_data = [
        [Paragraph('PAYMENT AMOUNT', amount_label_style)],
        [Paragraph(f"₹ {payment.amount:,.2f}", amount_style)],
        [Paragraph(f"({payment.currency})", amount_label_style)],
    ]

    amount_table = Table(amount_data, colWidths=[17 * cm])
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eff6ff')),
        ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor('#1e40af')),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))

    story.append(amount_table)
    story.append(Spacer(1, 0.3 * inch))

    # ─── Remarks ─────────────────────────────────────────────────────────────
    if payment.remarks:
        story.append(Paragraph("REMARKS", ParagraphStyle('SectionHead', parent=styles['Normal'],
                                                           fontSize=10, fontName='Helvetica-Bold',
                                                           textColor=colors.HexColor('#374151'))))
        story.append(Paragraph(payment.remarks, styles['Normal']))
        story.append(Spacer(1, 0.2 * inch))

    # ─── Footer ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                   textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("This is a system-generated payment advice. No signature required.", footer_style))
    story.append(Paragraph("AP Automation System | Confidential", footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
