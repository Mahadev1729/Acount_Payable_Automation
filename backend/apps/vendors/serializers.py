"""
Vendor Serializers
"""
from rest_framework import serializers
from .models import Vendor


class VendorSerializer(serializers.ModelSerializer):
    """Full vendor serializer with all fields."""
    created_by_name = serializers.SerializerMethodField()
    invoice_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ['id', 'vendor_code', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_invoice_count(self, obj):
        return obj.invoices.count() if hasattr(obj, 'invoices') else 0

    def validate_gstin(self, value):
        if value:
            import re
            pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(pattern, value.upper()):
                raise serializers.ValidationError('Invalid GSTIN format.')
        return value.upper() if value else value

    def validate_pan(self, value):
        if value:
            import re
            pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
            if not re.match(pattern, value.upper()):
                raise serializers.ValidationError('Invalid PAN format.')
        return value.upper() if value else value

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)


class VendorListSerializer(serializers.ModelSerializer):
    """Compact serializer for vendor list views."""
    class Meta:
        model = Vendor
        fields = [
            'id', 'vendor_code', 'vendor_name', 'company_name',
            'email', 'phone', 'gstin', 'status', 'city', 'state', 'created_at'
        ]
