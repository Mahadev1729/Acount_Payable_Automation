"""
Invoice Validation Engine
Checks mandatory fields, duplicates, GST format, amounts, and vendor existence
"""
import re
from django.db.models import Q
from .models import Invoice
from apps.vendors.models import Vendor


def validate_invoice(invoice):
    """
    Run all validation checks on an invoice.
    Returns list of error dicts: [{field, message, severity}]
    """
    errors = []

    # ─── Mandatory Field Validation ──────────────────────────────────────────
    if not invoice.invoice_number:
        errors.append({'field': 'invoice_number', 'message': 'Invoice number is required.', 'severity': 'error'})

    if not invoice.invoice_date:
        errors.append({'field': 'invoice_date', 'message': 'Invoice date is required.', 'severity': 'error'})

    if not invoice.total_amount or invoice.total_amount <= 0:
        errors.append({'field': 'total_amount', 'message': 'Total amount must be greater than 0.', 'severity': 'error'})

    # ─── Duplicate Invoice Detection ─────────────────────────────────────────
    if invoice.invoice_number:
        duplicate_qs = Invoice.objects.filter(
            invoice_number=invoice.invoice_number
        ).exclude(id=invoice.id)

        if invoice.vendor:
            duplicate_qs = duplicate_qs.filter(vendor=invoice.vendor)
        elif invoice.vendor_gstin:
            duplicate_qs = duplicate_qs.filter(vendor_gstin=invoice.vendor_gstin)

        if duplicate_qs.exists():
            dup = duplicate_qs.first()
            errors.append({
                'field': 'invoice_number',
                'message': f'Duplicate invoice detected. Already exists as Invoice ID: {dup.id}',
                'severity': 'error',
                'duplicate_id': dup.id,
            })
            invoice.is_duplicate = True
            invoice.duplicate_of = dup

    # ─── GST Format Validation ────────────────────────────────────────────────
    if invoice.vendor_gstin:
        gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_pattern, invoice.vendor_gstin.upper()):
            errors.append({
                'field': 'vendor_gstin',
                'message': 'Invalid GSTIN format.',
                'severity': 'warning'
            })

    # ─── Amount Validation ───────────────────────────────────────────────────
    if invoice.subtotal and invoice.tax_amount and invoice.total_amount:
        expected_total = float(invoice.subtotal) + float(invoice.tax_amount) - float(invoice.discount)
        actual_total = float(invoice.total_amount)
        if abs(expected_total - actual_total) > 1:  # Allow 1 rupee rounding tolerance
            errors.append({
                'field': 'total_amount',
                'message': f'Amount mismatch: Subtotal ({invoice.subtotal}) + Tax ({invoice.tax_amount}) - Discount ({invoice.discount}) = {expected_total:.2f} but Total is {invoice.total_amount}',
                'severity': 'warning'
            })

    # ─── Vendor Existence Validation ─────────────────────────────────────────
    if not invoice.vendor:
        if invoice.vendor_gstin:
            vendor = Vendor.objects.filter(gstin=invoice.vendor_gstin).first()
            if vendor:
                invoice.vendor = vendor
            else:
                errors.append({
                    'field': 'vendor',
                    'message': f'Vendor with GSTIN {invoice.vendor_gstin} not found in master. Please create vendor first.',
                    'severity': 'warning'
                })
        elif invoice.vendor_name_raw:
            vendor = Vendor.objects.filter(
                vendor_name__icontains=invoice.vendor_name_raw[:20]
            ).first()
            if vendor:
                invoice.vendor = vendor
            else:
                errors.append({
                    'field': 'vendor',
                    'message': f'Vendor "{invoice.vendor_name_raw}" not found in master.',
                    'severity': 'warning'
                })

    # ─── Payment Due Date Validation ─────────────────────────────────────────
    if invoice.invoice_date and invoice.payment_due_date:
        if invoice.payment_due_date < invoice.invoice_date:
            errors.append({
                'field': 'payment_due_date',
                'message': 'Payment due date cannot be before invoice date.',
                'severity': 'error'
            })

    return errors
