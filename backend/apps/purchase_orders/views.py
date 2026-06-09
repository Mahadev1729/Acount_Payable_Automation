"""
Purchase Order Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import PurchaseOrder, GoodsReceiptNote
from .serializers import PurchaseOrderSerializer, PurchaseOrderListSerializer, GoodsReceiptNoteSerializer
from .matching import two_way_match, three_way_match
from apps.invoices.models import Invoice


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    CRUD + Matching for Purchase Orders.
    POST /api/purchase-orders/{id}/match/ - trigger 2-way or 3-way match
    """
    queryset = PurchaseOrder.objects.select_related('vendor', 'created_by').order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vendor']
    search_fields = ['po_number', 'vendor__vendor_name', 'description']
    ordering_fields = ['created_at', 'po_date', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = PurchaseOrderSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            po = serializer.save()
            return Response({'success': True, 'message': 'PO created.', 'data': PurchaseOrderSerializer(po).data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='match')
    def match_invoice(self, request, pk=None):
        """
        Trigger 2-way or 3-way PO matching for an invoice.
        Body: {invoice_id, match_type: '2way'|'3way', grn_id (optional for 3way)}
        """
        po = self.get_object()
        invoice_id = request.data.get('invoice_id')
        match_type = request.data.get('match_type', '2way')
        grn_id = request.data.get('grn_id')

        if not invoice_id:
            return Response({'success': False, 'message': 'invoice_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({'success': False, 'message': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

        if match_type == '3way':
            if not grn_id:
                return Response({'success': False, 'message': 'grn_id is required for 3-way match.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                grn = GoodsReceiptNote.objects.get(id=grn_id)
            except GoodsReceiptNote.DoesNotExist:
                return Response({'success': False, 'message': 'GRN not found.'}, status=status.HTTP_404_NOT_FOUND)
            match_status, match_details = three_way_match(po, grn, invoice)
        else:
            match_status, match_details = two_way_match(po, invoice)

        # Update invoice match status
        invoice.match_status = match_status
        if match_status in ['two_way', 'three_way']:
            invoice.status = 'po_matched'
        invoice.save()

        return Response({
            'success': True,
            'match_status': match_status,
            'match_details': match_details,
            'invoice_id': invoice.id,
        })


class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    """CRUD for GRN records."""
    queryset = GoodsReceiptNote.objects.select_related('purchase_order', 'vendor').order_by('-grn_date')
    serializer_class = GoodsReceiptNoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['purchase_order', 'vendor']
    search_fields = ['grn_number', 'purchase_order__po_number']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            grn = serializer.save()
            return Response({'success': True, 'message': 'GRN created.', 'data': serializer.data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
