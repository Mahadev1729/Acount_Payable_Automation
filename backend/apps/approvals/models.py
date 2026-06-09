"""
Approval Workflow Model
State machine: Pending → AP Approved → Manager Approved → Finance Approved → Payment
"""
from django.db import models
from apps.invoices.models import Invoice


class Approval(models.Model):
    """
    Approval record for an invoice.
    Tracks every approval action in the workflow chain.
    """
    STAGE_CHOICES = [
        ('ap_review', 'AP Review'),
        ('manager_review', 'Manager Review'),
        ('finance_review', 'Finance Review'),
        ('payment', 'Payment'),
    ]

    ACTION_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('sent_back', 'Sent Back'),
        ('escalated', 'Escalated'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='approvals')
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='pending')
    approver = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approval_actions'
    )
    comments = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    action_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'approvals'
        verbose_name = 'Approval'
        verbose_name_plural = 'Approvals'
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Approval [{self.stage}] for Invoice #{self.invoice.invoice_number} - {self.action}"


class AuditLog(models.Model):
    """
    Audit trail for all system actions.
    """
    ACTION_TYPES = [
        ('invoice_upload', 'Invoice Upload'),
        ('ocr_run', 'OCR Processed'),
        ('invoice_validated', 'Invoice Validated'),
        ('approval_action', 'Approval Action'),
        ('payment_created', 'Payment Created'),
        ('vendor_created', 'Vendor Created'),
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('report_generated', 'Report Generated'),
        ('po_matched', 'PO Matched'),
    ]

    user = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL,
        null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.action}] by {self.user} at {self.created_at}"
