"""
PO Matching Engine
Implements 2-Way Match (PO vs Invoice) and 3-Way Match (PO vs GRN vs Invoice)
"""
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

TOLERANCE_PERCENT = 2.0  # 2% tolerance on amounts


def calculate_tolerance(amount):
    """Calculate allowed tolerance on an amount."""
    return float(amount) * (TOLERANCE_PERCENT / 100)


def two_way_match(purchase_order, invoice):
    """
    2-Way Match: Compare PO vs Invoice
    Checks: Vendor, Total Amount, Line Items
    Returns: (match_status, match_details)
    """
    details = []
    mismatches = []

    # ─── Vendor Match ─────────────────────────────────────────────────────────
    po_vendor = purchase_order.vendor
    inv_vendor = invoice.vendor

    if po_vendor and inv_vendor and po_vendor.id == inv_vendor.id:
        details.append({'check': 'Vendor', 'status': 'matched', 'po_value': str(po_vendor), 'inv_value': str(inv_vendor)})
    elif not inv_vendor:
        details.append({'check': 'Vendor', 'status': 'warning', 'message': 'Invoice vendor not linked to master'})
    else:
        mismatches.append({'check': 'Vendor', 'status': 'mismatch', 'po_value': str(po_vendor), 'inv_value': str(inv_vendor)})

    # ─── Amount Match ─────────────────────────────────────────────────────────
    po_total = float(purchase_order.total_amount)
    inv_total = float(invoice.total_amount)
    tolerance = calculate_tolerance(po_total)

    if abs(po_total - inv_total) <= tolerance:
        details.append({'check': 'Total Amount', 'status': 'matched', 'po_value': po_total, 'inv_value': inv_total})
    elif inv_total < po_total:
        details.append({'check': 'Total Amount', 'status': 'partial', 'po_value': po_total, 'inv_value': inv_total,
                        'message': f'Invoice amount ({inv_total}) is less than PO ({po_total})'})
        mismatches.append({'check': 'Total Amount', 'status': 'partial'})
    else:
        mismatches.append({'check': 'Total Amount', 'status': 'mismatch', 'po_value': po_total, 'inv_value': inv_total,
                           'message': f'Invoice amount ({inv_total}) exceeds PO ({po_total})'})

    # ─── Line Item Match ──────────────────────────────────────────────────────
    po_items = purchase_order.line_items or []
    inv_items = invoice.line_items or []

    if po_items and inv_items:
        matched_items = _match_line_items(po_items, inv_items)
        details.append({'check': 'Line Items', 'status': 'matched' if matched_items['all_matched'] else 'partial',
                        'details': matched_items})
        if not matched_items['all_matched']:
            mismatches.append({'check': 'Line Items', 'status': 'partial'})

    # ─── Determine Overall Match Status ─────────────────────────────────────
    if not mismatches:
        match_status = 'two_way'
    elif all(m['status'] == 'partial' for m in mismatches):
        match_status = 'partial'
    else:
        match_status = 'mismatch'

    return match_status, {'type': '2-way', 'checks': details + mismatches, 'mismatches': mismatches}


def three_way_match(purchase_order, grn, invoice):
    """
    3-Way Match: Compare PO vs GRN vs Invoice
    Returns: (match_status, match_details)
    """
    # First run 2-way match
    two_way_status, two_way_details = two_way_match(purchase_order, invoice)
    details = list(two_way_details['checks'])
    mismatches = list(two_way_details['mismatches'])

    # ─── GRN vs Invoice Match ─────────────────────────────────────────────────
    grn_amount = float(grn.total_received_amount)
    inv_total = float(invoice.total_amount)
    tolerance = calculate_tolerance(grn_amount)

    if abs(grn_amount - inv_total) <= tolerance:
        details.append({'check': 'GRN Amount vs Invoice', 'status': 'matched',
                        'grn_value': grn_amount, 'inv_value': inv_total})
    else:
        mismatch_item = {'check': 'GRN Amount vs Invoice', 'status': 'mismatch',
                           'grn_value': grn_amount, 'inv_value': inv_total,
                           'message': f'GRN ({grn_amount}) does not match Invoice ({inv_total})'}
        details.append(mismatch_item)
        mismatches.append(mismatch_item)

    # ─── GRN Quantity vs Invoice Quantity ────────────────────────────────────
    grn_items = grn.received_items or []
    inv_items = invoice.line_items or []

    if grn_items and inv_items:
        qty_match = _match_quantities(grn_items, inv_items)
        if not qty_match['all_matched']:
            mismatch_item = {'check': 'Quantities', 'status': 'partial', 'details': qty_match}
            details.append(mismatch_item)
            mismatches.append(mismatch_item)
        else:
            details.append({'check': 'Quantities', 'status': 'matched'})

    # ─── Final Status ─────────────────────────────────────────────────────────
    if not mismatches:
        match_status = 'three_way'
    elif all(m['status'] == 'partial' for m in mismatches):
        match_status = 'partial'
    else:
        match_status = 'mismatch'

    return match_status, {'type': '3-way', 'checks': details, 'mismatches': mismatches}


def _match_line_items(po_items, inv_items):
    """Compare PO and invoice line items."""
    matched = 0
    unmatched = []

    for po_item in po_items:
        found = False
        for inv_item in inv_items:
            po_desc = str(po_item.get('description', '')).lower()[:20]
            inv_desc = str(inv_item.get('description', '')).lower()[:20]
            if po_desc and inv_desc and (po_desc in inv_desc or inv_desc in po_desc):
                # Check amount
                po_amt = float(po_item.get('amount', 0) or 0)
                inv_amt = float(inv_item.get('amount', 0) or 0)
                if abs(po_amt - inv_amt) <= calculate_tolerance(po_amt or 1):
                    matched += 1
                    found = True
                    break
        if not found:
            unmatched.append(po_item)

    all_matched = len(unmatched) == 0
    return {
        'all_matched': all_matched,
        'matched_count': matched,
        'unmatched_count': len(unmatched),
        'unmatched_items': unmatched,
    }


def _match_quantities(grn_items, inv_items):
    """Compare GRN quantities vs invoice quantities."""
    mismatches = []
    for grn_item in grn_items:
        grn_qty = float(grn_item.get('quantity_received', 0) or 0)
        for inv_item in inv_items:
            inv_qty = float(inv_item.get('quantity', 0) or 0)
            grn_desc = str(grn_item.get('description', '')).lower()[:20]
            inv_desc = str(inv_item.get('description', '')).lower()[:20]
            if grn_desc and inv_desc and (grn_desc in inv_desc or inv_desc in grn_desc):
                if abs(grn_qty - inv_qty) > 0.01:
                    mismatches.append({
                        'description': grn_item.get('description'),
                        'grn_qty': grn_qty,
                        'inv_qty': inv_qty
                    })
                break
    return {'all_matched': len(mismatches) == 0, 'mismatches': mismatches}
