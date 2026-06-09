"""
Approval Serializers
"""
from rest_framework import serializers
from .models import Approval, AuditLog
from apps.invoices.serializers import InvoiceListSerializer


class ApprovalSerializer(serializers.ModelSerializer):
    invoice_detail = InvoiceListSerializer(source='invoice', read_only=True)
    approver_name = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at', 'action_at']

    def get_approver_name(self, obj):
        return obj.approver.get_full_name() if obj.approver else None


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approval action (approve/reject/send_back)."""
    action = serializers.ChoiceField(choices=['approved', 'rejected', 'sent_back'])
    comments = serializers.CharField(required=False, allow_blank=True, default='')


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'
