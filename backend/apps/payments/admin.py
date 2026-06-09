"""
Payments Admin
"""
from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payment_id', 'invoice', 'vendor', 'amount', 'payment_mode', 'status', 'payment_date']
    list_filter = ['status', 'payment_mode']
    search_fields = ['payment_id', 'reference_number', 'vendor__vendor_name']
    readonly_fields = ['payment_id', 'created_at', 'updated_at']
