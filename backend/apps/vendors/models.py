"""
Vendor Model for AP Automation System
Stores all vendor master data including bank details, GST, PAN, etc.
"""
import re
from django.db import models
from django.core.exceptions import ValidationError


def validate_gstin(value):
    """Validate GST Identification Number format."""
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    if value and not re.match(pattern, value.upper()):
        raise ValidationError('Invalid GSTIN format. Expected: 22AAAAA0000A1Z5')


def validate_pan(value):
    """Validate PAN number format."""
    pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
    if value and not re.match(pattern, value.upper()):
        raise ValidationError('Invalid PAN format. Expected: ABCDE1234F')


def validate_ifsc(value):
    """Validate IFSC code format."""
    pattern = r'^[A-Z]{4}0[A-Z0-9]{6}$'
    if value and not re.match(pattern, value.upper()):
        raise ValidationError('Invalid IFSC code format. Expected: SBIN0001234')


class Vendor(models.Model):
    """
    Vendor master data model.
    Contains all vendor details including banking and tax information.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending Approval'),
        ('blacklisted', 'Blacklisted'),
    ]

    ACCOUNT_TYPE_CHOICES = [
        ('savings', 'Savings'),
        ('current', 'Current'),
        ('cash_credit', 'Cash Credit'),
    ]

    # Basic Info
    vendor_code = models.CharField(max_length=20, unique=True, blank=True)
    vendor_name = models.CharField(max_length=255, db_index=True)
    company_name = models.CharField(max_length=255)
    vendor_type = models.CharField(max_length=50, blank=True, default='supplier')

    # Contact Info
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)

    # Address
    address_line1 = models.TextField()
    address_line2 = models.TextField(blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default='India')

    # Tax Info
    gstin = models.CharField(
        max_length=15, blank=True, null=True,
        validators=[validate_gstin],
        verbose_name='GSTIN'
    )
    pan = models.CharField(
        max_length=10, blank=True, null=True,
        validators=[validate_pan],
        verbose_name='PAN'
    )
    tan = models.CharField(max_length=10, blank=True)
    msme_registered = models.BooleanField(default=False)
    msme_number = models.CharField(max_length=20, blank=True)

    # Bank Details
    bank_name = models.CharField(max_length=255)
    bank_branch = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=20)
    ifsc_code = models.CharField(max_length=11, validators=[validate_ifsc])
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='current')
    account_holder_name = models.CharField(max_length=255, blank=True)

    # Status & Audit
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_terms = models.IntegerField(default=30, help_text='Payment terms in days')
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='created_vendors'
    )

    class Meta:
        db_table = 'vendors'
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'
        ordering = ['vendor_name']

    def __str__(self):
        return f"{self.vendor_code} - {self.vendor_name}"

    def save(self, *args, **kwargs):
        # Auto-generate vendor code
        if not self.vendor_code:
            last = Vendor.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.vendor_code = f"VND-{next_id:04d}"

        # Normalize GSTIN and PAN to uppercase
        if self.gstin:
            self.gstin = self.gstin.upper()
        if self.pan:
            self.pan = self.pan.upper()
        if self.ifsc_code:
            self.ifsc_code = self.ifsc_code.upper()

        super().save(*args, **kwargs)
