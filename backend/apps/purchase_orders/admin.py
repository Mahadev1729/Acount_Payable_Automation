"""
Purchase Orders Admin
"""
from django.contrib import admin
from .models import PurchaseOrder, GoodsReceiptNote


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'vendor', 'total_amount', 'status', 'po_date']
    list_filter = ['status']
    search_fields = ['po_number', 'vendor__vendor_name']


@admin.register(GoodsReceiptNote)
class GoodsReceiptNoteAdmin(admin.ModelAdmin):
    list_display = ['grn_number', 'purchase_order', 'vendor', 'grn_date']
    search_fields = ['grn_number']
