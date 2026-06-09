"""
Invoice Serializers
Handles upload, OCR correction, list/detail views
"""
from rest_framework import serializers
from .models import Invoice
from apps.vendors.serializers import VendorListSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    """Full invoice serializer."""
    vendor_detail = VendorListSerializer(source='vendor', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'ocr_processed']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.invoice_file and request:
            return request.build_absolute_uri(obj.invoice_file.url)
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class InvoiceListSerializer(serializers.ModelSerializer):
    """Compact serializer for invoice list."""
    vendor_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'vendor_name',
            'vendor_gstin', 'po_number', 'total_amount', 'status',
            'match_status', 'ocr_processed', 'ocr_confidence',
            'is_duplicate', 'created_at', 'file_url', 'payment_due_date'
        ]

    def get_vendor_name(self, obj):
        return obj.vendor.vendor_name if obj.vendor else obj.vendor_name_raw

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.invoice_file and request:
            return request.build_absolute_uri(obj.invoice_file.url)
        return None


class InvoiceUploadSerializer(serializers.ModelSerializer):
    """Minimal serializer for invoice file upload."""
    class Meta:
        model = Invoice
        fields = ['invoice_file', 'notes']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class OCRCorrectionSerializer(serializers.ModelSerializer):
    """Serializer for saving manually corrected OCR fields."""
    class Meta:
        model = Invoice
        fields = [
            'invoice_number', 'invoice_date', 'payment_due_date',
            'vendor', 'vendor_name_raw', 'vendor_gstin', 'vendor_address',
            'po_number', 'subtotal', 'tax_amount', 'tax_percentage',
            'discount', 'total_amount', 'line_items', 'currency', 'notes'
        ]

    def update(self, instance, validated_data):
        # When corrections saved, move to validated status
        instance = super().update(instance, validated_data)
        if instance.status in ['ocr_complete', 'pending']:
            instance.status = 'validated'
            instance.save()
        return instance
