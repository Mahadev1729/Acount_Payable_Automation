"""
Payment Serializers
"""
from rest_framework import serializers
from .models import Payment
from apps.invoices.serializers import InvoiceListSerializer
from apps.vendors.serializers import VendorListSerializer


class PaymentSerializer(serializers.ModelSerializer):
    invoice_detail = InvoiceListSerializer(source='invoice', read_only=True)
    vendor_detail = VendorListSerializer(source='vendor', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'payment_id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class PaymentListSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'invoice_number', 'vendor_name',
            'amount', 'payment_date', 'payment_mode', 'reference_number',
            'status', 'created_at'
        ]

    def get_vendor_name(self, obj):
        return obj.vendor.vendor_name if obj.vendor else 'N/A'

    def get_invoice_number(self, obj):
        return obj.invoice.invoice_number if obj.invoice else 'N/A'
