"""
Approvals Admin
"""
from django.contrib import admin
from .models import Approval, AuditLog


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'stage', 'action', 'approver', 'assigned_at', 'action_at']
    list_filter = ['stage', 'action']
    search_fields = ['invoice__invoice_number']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'user', 'description', 'object_type', 'object_id', 'created_at']
    list_filter = ['action']
    readonly_fields = ['created_at']
