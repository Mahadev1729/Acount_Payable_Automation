"""
Payment Model
Tracks invoice payments from initiation to completion.
"""
from django.db import models
from apps.invoices.models import Invoice
from apps.vendors.models import Vendor


class Payment(models.Model):
    """
    Payment record linked to an approved invoice.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_MODE_CHOICES = [
        ('neft', 'NEFT'),
        ('rtgs', 'RTGS'),
        ('imps', 'IMPS'),
        ('cheque', 'Cheque'),
        ('dd', 'Demand Draft'),
        ('online', 'Online Transfer'),
    ]

    # Auto-generated payment ID
    payment_id = models.CharField(max_length=30, unique=True, blank=True)

    invoice = models.OneToOneField(
        Invoice, on_delete=models.CASCADE, related_name='payment', null=True, blank=True
    )
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, related_name='payments'
    )

    # Amount
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')

    # Payment Details
    payment_date = models.DateField(null=True, blank=True)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default='neft')
    reference_number = models.CharField(max_length=100, blank=True)
    bank_reference = models.CharField(max_length=100, blank=True)

    # Bank Info (snapshot at payment time)
    bank_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='created_payments'
    )

    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.payment_id} - {self.amount} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-generate payment ID
        if not self.payment_id:
            last = Payment.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.payment_id = f"PAY-{next_id:06d}"

        # Copy vendor bank details if not set
        if self.vendor and not self.bank_name:
            self.bank_name = self.vendor.bank_name
            self.account_number = self.vendor.account_number
            self.ifsc_code = self.vendor.ifsc_code

        super().save(*args, **kwargs)

        # Update linked invoice status when payment is marked paid
        if self.status == 'paid' and self.invoice:
            self.invoice.status = 'paid'
            self.invoice.save(update_fields=['status'])
