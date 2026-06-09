"""
Vendor Admin Registration
"""
from django.contrib import admin
from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['vendor_code', 'vendor_name', 'email', 'gstin', 'status', 'created_at']
    list_filter = ['status', 'state', 'msme_registered']
    search_fields = ['vendor_name', 'email', 'gstin', 'pan']
    readonly_fields = ['vendor_code', 'created_at', 'updated_at']
