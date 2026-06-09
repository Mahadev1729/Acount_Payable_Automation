"""
OCR Engine for AP Automation System
Uses Tesseract OCR + OpenCV to extract invoice data from PDF/images.
Handles: Invoice Number, Vendor Name, Date, GST, PO Number, Amounts, Line Items
"""
import re
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)


def get_tesseract_available():
    """Check if Tesseract is available."""
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = getattr(
            settings, 'TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        )
        pytesseract.get_tesseract_version()
        return True, pytesseract
    except Exception as e:
        logger.warning(f"Tesseract not available: {e}")
        return False, None


def extract_text_from_image(image_path):
    """
    Extract raw text from an image file using Tesseract OCR.
    Returns (text, confidence_score)
    """
    available, pytesseract = get_tesseract_available()
    if not available:
        return "", 0.0

    try:
        import cv2
        import numpy as np
        from PIL import Image

        # Load image
        img = cv2.imread(image_path)
        if img is None:
            img = np.array(Image.open(image_path).convert('RGB'))
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        # Preprocessing pipeline for better OCR accuracy
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Adaptive threshold for better text extraction
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # OCR config for invoice-style text
        config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/.-:,@#%& '

        # Get text with confidence
        data = pytesseract.image_to_data(thresh, config=config, output_type=pytesseract.Output.DICT)
        text = pytesseract.image_to_string(thresh, config=config)

        # Calculate average confidence
        confidences = [int(c) for c in data['conf'] if c != '-1' and int(c) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return text, round(avg_confidence / 100, 2)

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return "", 0.0


def extract_text_from_pdf(pdf_path):
    """
    Extract text directly from PDF using PyMuPDF (fitz).
    This is faster and doesn't require Tesseract or Poppler for digital PDFs.
    Returns (combined_text, confidence_score)
    """
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(pdf_path)
        all_text = []
        
        for page in doc:
            all_text.append(page.get_text("text"))
            
        combined_text = '\n'.join(all_text)
        
        # PyMuPDF extracts exact text, so confidence is essentially 100% (1.0)
        # If the text is empty, it might be a scanned PDF image without OCR layer.
        confidence = 0.95 if combined_text.strip() else 0.0
        
        doc.close()
        return combined_text, confidence
        
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return "", 0.0


def parse_invoice_fields(text):
    """
    Parse extracted OCR text to identify invoice fields using regex patterns.
    Returns a dict of extracted fields.
    """
    fields = {
        'invoice_number': None,
        'invoice_date': None,
        'vendor_name': None,
        'vendor_gstin': None,
        'po_number': None,
        'subtotal': None,
        'tax_amount': None,
        'tax_percentage': None,
        'total_amount': None,
        'payment_due_date': None,
        'line_items': [],
    }

    lines = [line.strip() for line in text.split('\n') if line.strip()]

    # ─── Invoice Number ──────────────────────────────────────────────────────
    inv_patterns = [
        r'(?:invoice\s*(?:no|number|#)[\s:]*)([\w\-\/]+)',
        r'(?:inv[\s.#:]*)([\w\-\/]+)',
        r'(?:bill\s*(?:no|number)[\s:]*)([\w\-\/]+)',
    ]
    for pattern in inv_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['invoice_number'] = match.group(1).strip()
            break

    # ─── Invoice Date ─────────────────────────────────────────────────────────
    date_patterns = [
        r'(?:invoice\s*date[\s:]*)([\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{2,4})',
        r'(?:date[\s:]*)([\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{2,4})',
        r'([\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{4})',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['invoice_date'] = match.group(1).strip()
            break

    # ─── GSTIN ────────────────────────────────────────────────────────────────
    gstin_pattern = r'[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}'
    gstin_match = re.search(gstin_pattern, text, re.IGNORECASE)
    if gstin_match:
        fields['vendor_gstin'] = gstin_match.group().upper()

    # ─── PO Number ───────────────────────────────────────────────────────────
    po_patterns = [
        r'(?:p\.?o\.?\s*(?:no|number|#)[\s:]*)([\w\-\/]+)',
        r'(?:purchase\s*order[\s:]*)([\w\-\/]+)',
    ]
    for pattern in po_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['po_number'] = match.group(1).strip()
            break

    # ─── Amounts ─────────────────────────────────────────────────────────────
    # Total Amount
    total_patterns = [
        r'(?:grand\s*total|total\s*amount|total\s*due|amount\s*due|net\s*payable)[\s:₹Rs.INR]*([\d,]+\.?\d*)',
        r'(?:total)[\s:₹Rs.INR]*([\d,]+\.?\d*)',
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['total_amount'] = _parse_amount(match.group(1))
            break

    # Subtotal
    sub_patterns = [
        r'(?:sub\s*total|subtotal|net\s*amount)[\s:₹Rs.INR]*([\d,]+\.?\d*)',
    ]
    for pattern in sub_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['subtotal'] = _parse_amount(match.group(1))
            break

    # Tax Amount / GST
    tax_patterns = [
        r'(?:gst|cgst|sgst|igst|tax\s*amount|tax)[\s:₹Rs.INR@]*([\d,]+\.?\d*)\s*%?',
        r'(?:tax)[\s:₹Rs.INR]*([\d,]+\.?\d*)',
    ]
    for pattern in tax_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            val = match.group(1)
            parsed = _parse_amount(val)
            if parsed and parsed < 100:  # likely a percentage
                fields['tax_percentage'] = parsed
            else:
                fields['tax_amount'] = parsed
            break

    # ─── Vendor Name (first non-empty lines often contain vendor name) ────────
    for line in lines[:10]:
        if len(line) > 5 and not any(keyword in line.lower() for keyword in
                                      ['invoice', 'tax', 'gst', 'date', 'total', 'page']):
            if re.search(r'[a-zA-Z]{3,}', line):
                fields['vendor_name'] = line[:100]
                break

    # ─── Line Items ──────────────────────────────────────────────────────────
    fields['line_items'] = _extract_line_items(text)

    return fields


def _parse_amount(value_str):
    """Parse amount string to float, removing commas and currency symbols."""
    if not value_str:
        return None
    try:
        cleaned = re.sub(r'[₹,\s]', '', value_str)
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _extract_line_items(text):
    """
    Attempt to extract line items (materials) from invoice text.
    Returns list of dicts with description, quantity, rate, amount.
    """
    line_items = []
    lines = text.split('\n')

    # Pattern: look for lines with numbers that could be qty/rate/amount
    item_pattern = re.compile(
        r'(.{5,40}?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)'
    )

    for line in lines:
        match = item_pattern.search(line)
        if match:
            desc = match.group(1).strip()
            # Filter out header rows
            if any(kw in desc.lower() for kw in ['description', 'item', 'particular', 'sno', 'sl']):
                continue
            try:
                line_items.append({
                    'description': desc,
                    'quantity': _parse_amount(match.group(2)),
                    'rate': _parse_amount(match.group(3)),
                    'amount': _parse_amount(match.group(4)),
                    'hsn_code': '',
                    'unit': '',
                })
            except Exception:
                pass

    return line_items[:50]  # Limit to 50 line items


def process_invoice_file(file_path):
    """
    Main entry point for OCR processing.
    Detects file type, extracts text, parses fields.
    Returns dict: {fields, raw_text, confidence}
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        raw_text, confidence = extract_text_from_pdf(file_path)
    elif ext in ['.jpg', '.jpeg', '.png', '.tiff', '.tif']:
        raw_text, confidence = extract_text_from_image(file_path)
    else:
        return {
            'success': False,
            'error': f'Unsupported file type: {ext}',
            'fields': {},
            'raw_text': '',
            'confidence': 0.0
        }

    if not raw_text.strip():
        return {
            'success': False,
            'error': 'No text could be extracted from the file. Check Tesseract installation.',
            'fields': {},
            'raw_text': '',
            'confidence': 0.0
        }

    fields = parse_invoice_fields(raw_text)

    return {
        'success': True,
        'fields': fields,
        'raw_text': raw_text,
        'confidence': confidence,
        'error': None,
    }
