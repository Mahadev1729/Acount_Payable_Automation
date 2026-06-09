"""
Invoice Admin
"""
from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'vendor_name_raw', 'total_amount', 'status', 'match_status', 'created_at']
    list_filter = ['status', 'match_status', 'ocr_processed', 'is_duplicate']
    search_fields = ['invoice_number', 'vendor_name_raw', 'vendor_gstin', 'po_number']
    readonly_fields = ['created_at', 'updated_at', 'ocr_confidence', 'ocr_processed']
