"""
Purchase Order Serializers
"""
from rest_framework import serializers
from .models import PurchaseOrder, GoodsReceiptNote
from apps.vendors.serializers import VendorListSerializer


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_detail = VendorListSerializer(source='vendor', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_number', 'po_date', 'vendor_name', 'total_amount', 'status', 'created_at']

    def get_vendor_name(self, obj):
        return obj.vendor.vendor_name if obj.vendor else 'N/A'


class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceiptNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_vendor_name(self, obj):
        return obj.vendor.vendor_name if obj.vendor else 'N/A'

    def get_po_number(self, obj):
        return obj.purchase_order.po_number if obj.purchase_order else 'N/A'

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
