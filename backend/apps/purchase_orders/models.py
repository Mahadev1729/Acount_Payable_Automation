"""
Purchase Order and GRN Models
"""
from django.db import models
from apps.vendors.models import Vendor


class PurchaseOrder(models.Model):
    """
    Purchase Order model.
    Used for 2-way and 3-way matching with invoices.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('partially_received', 'Partially Received'),
        ('fully_received', 'Fully Received'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]

    po_number = models.CharField(max_length=100, unique=True, db_index=True)
    po_date = models.DateField()
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, related_name='purchase_orders')
    delivery_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

    # Amounts
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Line Items (list of dicts)
    line_items = models.JSONField(default=list, blank=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='approved')
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='created_pos'
    )

    class Meta:
        db_table = 'purchase_orders'
        verbose_name = 'Purchase Order'
        verbose_name_plural = 'Purchase Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"PO #{self.po_number}"


class GoodsReceiptNote(models.Model):
    """
    Goods Receipt Note (GRN) model.
    Records actual goods received against a PO — used for 3-way matching.
    """
    grn_number = models.CharField(max_length=100, unique=True)
    grn_date = models.DateField()
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='grns')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, related_name='grns')

    # Received Items (list of dicts: {description, quantity_ordered, quantity_received, unit_price})
    received_items = models.JSONField(default=list)

    total_received_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='created_grns'
    )

    class Meta:
        db_table = 'goods_receipt_notes'
        verbose_name = 'Goods Receipt Note'
        verbose_name_plural = 'Goods Receipt Notes'
        ordering = ['-grn_date']

    def __str__(self):
        return f"GRN #{self.grn_number} for PO #{self.purchase_order.po_number}"
