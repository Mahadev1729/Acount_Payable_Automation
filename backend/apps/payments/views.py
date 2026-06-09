"""
Payment Views
"""
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Payment
from .serializers import PaymentSerializer, PaymentListSerializer
from .pdf_generator import generate_payment_advice_pdf


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Payments + PDF advice download.
    GET /api/payments/{id}/advice/ → download PDF
    """
    queryset = Payment.objects.select_related('invoice', 'vendor', 'created_by').order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_mode', 'vendor']
    search_fields = ['payment_id', 'reference_number', 'vendor__vendor_name', 'invoice__invoice_number']
    ordering_fields = ['created_at', 'payment_date', 'amount', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = PaymentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            payment = serializer.save()
            return Response({
                'success': True,
                'message': 'Payment record created.',
                'data': PaymentSerializer(payment, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = PaymentSerializer(instance, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            payment = serializer.save()
            return Response({'success': True, 'message': 'Payment updated.', 'data': PaymentSerializer(payment).data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='advice')
    def download_advice(self, request, pk=None):
        """
        Generate and download Payment Advice PDF.
        GET /api/payments/{id}/advice/
        """
        payment = self.get_object()
        try:
            pdf_buffer = generate_payment_advice_pdf(payment)
            response = FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=f"Payment_Advice_{payment.payment_id}.pdf",
                content_type='application/pdf'
            )
            return response
        except Exception as e:
            return Response({'success': False, 'message': f'PDF generation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Payment statistics for dashboard."""
        from django.db.models import Sum, Count
        qs = Payment.objects.all()
        total_paid = qs.filter(status='paid').aggregate(total=Sum('amount'))['total'] or 0
        pending_amount = qs.filter(status__in=['pending', 'initiated']).aggregate(total=Sum('amount'))['total'] or 0

        status_breakdown = list(qs.values('status').annotate(count=Count('id'), total=Sum('amount')))

        return Response({
            'success': True,
            'data': {
                'total_paid': float(total_paid),
                'pending_amount': float(pending_amount),
                'total_count': qs.count(),
                'paid_count': qs.filter(status='paid').count(),
                'pending_count': qs.filter(status__in=['pending', 'initiated']).count(),
                'failed_count': qs.filter(status='failed').count(),
                'status_breakdown': status_breakdown,
            }
        })
