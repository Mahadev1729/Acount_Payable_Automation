"""
Custom Permission Classes for AP Automation System
"""
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Only admin users can access."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsAdminOrManager(BasePermission):
    """Admin or Manager can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'manager']
        )


class IsAdminOrFinance(BasePermission):
    """Admin or Finance Team can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'finance']
        )


class IsAPExecutiveOrAbove(BasePermission):
    """AP Executive, Manager, Finance, or Admin can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'ap_executive', 'manager', 'finance']
        )
