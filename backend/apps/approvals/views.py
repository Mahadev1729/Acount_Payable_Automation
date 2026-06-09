"""
Approval Views
Handles workflow initiation and approval actions
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Approval, AuditLog
from .serializers import ApprovalSerializer, ApprovalActionSerializer, AuditLogSerializer
from .workflow import initiate_workflow, process_approval_action, get_current_stage
from apps.invoices.models import Invoice


class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Approval queue — read-only list with action endpoint.
    GET  /api/approvals/
    GET  /api/approvals/{id}/
    POST /api/approvals/{id}/action/
    POST /api/approvals/initiate/
    GET  /api/approvals/pending/
    """
    queryset = Approval.objects.select_related('invoice', 'approver').order_by('-assigned_at')
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['stage', 'action', 'invoice']
    search_fields = ['invoice__invoice_number', 'invoice__vendor_name_raw']
    ordering_fields = ['assigned_at', 'due_date']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data, 'count': queryset.count()})

    @action(detail=False, methods=['get'], url_path='pending')
    def pending_approvals(self, request):
        """Get pending approvals for current user's role."""
        from .workflow import STAGE_REQUIRED_ROLES
        user_role = request.user.role
        # Find stages where this role can act
        user_stages = [stage for stage, roles in STAGE_REQUIRED_ROLES.items() if user_role in roles]
        pending = Approval.objects.filter(stage__in=user_stages, action='pending').select_related('invoice', 'approver')
        serializer = ApprovalSerializer(pending, many=True)
        return Response({'success': True, 'data': serializer.data, 'count': pending.count()})

    @action(detail=True, methods=['post'], url_path='action')
    def take_action(self, request, pk=None):
        """
        Approve, reject, or send back an invoice.
        POST /api/approvals/{id}/action/
        Body: {action: 'approved'|'rejected'|'sent_back', comments: '...'}
        """
        approval = self.get_object()

        if approval.action != 'pending':
            return Response({
                'success': False,
                'message': f'This approval is already {approval.action} and cannot be acted on.'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        success, message = process_approval_action(
            approval=approval,
            action=serializer.validated_data['action'],
            approver=request.user,
            comments=serializer.validated_data.get('comments', '')
        )

        if success:
            return Response({'success': True, 'message': message,
                             'data': ApprovalSerializer(approval).data})
        return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='initiate')
    def initiate(self, request):
        """
        Initiate approval workflow for a validated invoice.
        POST /api/approvals/initiate/
        Body: {invoice_id: N}
        """
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response({'success': False, 'message': 'invoice_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({'success': False, 'message': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status not in ['validated', 'po_matched']:
            return Response({
                'success': False,
                'message': f'Invoice must be validated before initiating workflow. Current status: {invoice.status}'
            }, status=status.HTTP_400_BAD_REQUEST)

        approval = initiate_workflow(invoice, request.user)
        return Response({
            'success': True,
            'message': 'Approval workflow initiated.',
            'data': ApprovalSerializer(approval).data
        }, status=status.HTTP_201_CREATED)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log viewer."""
    queryset = AuditLog.objects.select_related('user').order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'user', 'object_type']
    search_fields = ['description', 'user__email']
    ordering_fields = ['created_at']
