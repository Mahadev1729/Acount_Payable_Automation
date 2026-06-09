"""
Invoice Model for AP Automation System
Stores all invoice data including OCR-extracted fields and line items
"""
import os
from django.db import models
from django.core.validators import FileExtensionValidator
from apps.vendors.models import Vendor


def invoice_upload_path(instance, filename):
    """Store invoices organized by vendor and year."""
    ext = os.path.splitext(filename)[1]
    return f"uploads/invoices/{instance.vendor_id or 'unknown'}/{filename}"


class Invoice(models.Model):
    """
    Core Invoice model.
    Tracks the complete lifecycle of an invoice from upload to payment.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Review'),
        ('ocr_complete', 'OCR Complete'),
        ('validated', 'Validated'),
        ('po_matched', 'PO Matched'),
        ('ap_approved', 'AP Approved'),
        ('manager_approved', 'Manager Approved'),
        ('finance_approved', 'Finance Approved'),
        ('payment_initiated', 'Payment Initiated'),
        ('paid', 'Paid'),
        ('rejected', 'Rejected'),
        ('on_hold', 'On Hold'),
        ('duplicate', 'Duplicate'),
    ]

    MATCH_STATUS_CHOICES = [
        ('not_matched', 'Not Matched'),
        ('two_way', '2-Way Matched'),
        ('three_way', '3-Way Matched'),
        ('partial', 'Partially Matched'),
        ('mismatch', 'Mismatch'),
    ]

    # Invoice Identity
    invoice_number = models.CharField(max_length=100, db_index=True)
    invoice_date = models.DateField(null=True, blank=True)
    payment_due_date = models.DateField(null=True, blank=True)

    # Vendor Info
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invoices'
    )
    vendor_name_raw = models.CharField(max_length=255, blank=True)  # Raw OCR extracted
    vendor_gstin = models.CharField(max_length=15, blank=True)
    vendor_address = models.TextField(blank=True)

    # PO Reference
    po_number = models.CharField(max_length=100, blank=True, db_index=True)

    # Amounts
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='INR')

    # File
    invoice_file = models.FileField(
        upload_to=invoice_upload_path,
        validators=[FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'])],
        null=True, blank=True
    )

    # OCR Data
    ocr_data = models.JSONField(default=dict, blank=True)  # Raw OCR extracted data
    ocr_confidence = models.FloatField(default=0.0)  # OCR accuracy %
    ocr_processed = models.BooleanField(default=False)
    ocr_error = models.TextField(blank=True)

    # Line Items (JSON Array)
    line_items = models.JSONField(default=list, blank=True)

    # Status & Matching
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft', db_index=True)
    match_status = models.CharField(max_length=20, choices=MATCH_STATUS_CHOICES, default='not_matched')

    # Validation
    is_duplicate = models.BooleanField(default=False)
    duplicate_of = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='duplicate_invoices'
    )
    validation_errors = models.JSONField(default=list, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='created_invoices'
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'invoices'
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.vendor_name_raw or 'Unknown Vendor'}"

    @property
    def file_extension(self):
        if self.invoice_file:
            return os.path.splitext(self.invoice_file.name)[1].lower()
        return None

    @property
    def is_overdue(self):
        from django.utils import timezone
        if self.payment_due_date and self.status not in ['paid']:
            return self.payment_due_date < timezone.now().date()
        return False
