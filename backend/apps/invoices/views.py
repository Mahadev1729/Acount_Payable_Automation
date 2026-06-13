"""
Invoice Views
Handles upload, OCR trigger, correction, listing, validation, bulk upload
"""
import os
import logging
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Invoice
from .serializers import (
    InvoiceSerializer, InvoiceListSerializer,
    InvoiceUploadSerializer, OCRCorrectionSerializer
)
from .ocr_engine import process_invoice_file
from .validators import validate_invoice

logger = logging.getLogger(__name__)


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Full CRUD + OCR actions for invoices.
    GET/POST      /api/invoices/
    GET/PUT/DELETE /api/invoices/{id}/
    POST          /api/invoices/{id}/run-ocr/
    PUT           /api/invoices/{id}/correct/
    POST          /api/invoices/{id}/validate/
    POST          /api/invoices/bulk-upload/
    GET           /api/invoices/stats/
    """
    queryset = Invoice.objects.select_related('vendor', 'created_by').order_by('-created_at')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'match_status', 'vendor', 'is_duplicate', 'ocr_processed']
    search_fields = ['invoice_number', 'vendor_name_raw', 'vendor_gstin', 'po_number']
    ordering_fields = ['created_at', 'invoice_date', 'total_amount', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        if self.action == 'create':
            return InvoiceUploadSerializer
        return InvoiceSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = InvoiceListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = InvoiceListSerializer(queryset, many=True, context={'request': request})
        return Response({'success': True, 'data': serializer.data, 'count': queryset.count()})

    def create(self, request, *args, **kwargs):
        """Upload single invoice file."""
        serializer = InvoiceUploadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            invoice = serializer.save()
            return Response({
                'success': True,
                'message': 'Invoice uploaded successfully.',
                'data': InvoiceSerializer(invoice, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='bulk-upload', parser_classes=[MultiPartParser])
    def bulk_upload(self, request):
        """Upload multiple invoice files at once."""
        files = request.FILES.getlist('files')
        if not files:
            return Response({'success': False, 'message': 'No files provided.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        errors = []

        for file in files:
            ext = os.path.splitext(file.name)[1].lower()
            if ext not in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif']:
                errors.append({'file': file.name, 'error': f'Unsupported format: {ext}'})
                continue
            try:
                invoice = Invoice.objects.create(
                    invoice_file=file,
                    status='pending',
                    created_by=request.user
                )
                created.append({'id': invoice.id, 'file': file.name})
            except Exception as e:
                errors.append({'file': file.name, 'error': str(e)})

        return Response({
            'success': True,
            'message': f'{len(created)} invoices uploaded, {len(errors)} failed.',
            'created': created,
            'errors': errors,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='run-ocr')
    def run_ocr(self, request, pk=None):
        """
        Trigger OCR processing on an uploaded invoice.
        POST /api/invoices/{id}/run-ocr/
        """
        invoice = self.get_object()

        if not invoice.invoice_file:
            return Response({
                'success': False,
                'message': 'No invoice file attached to this record.'
            }, status=status.HTTP_400_BAD_REQUEST)

        file_path = invoice.invoice_file.path

        if not os.path.exists(file_path):
            return Response({
                'success': False,
                'message': 'Invoice file not found on disk.'
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            result = process_invoice_file(file_path)

            # Store OCR results on invoice
            invoice.ocr_data = {
                'raw_text': result.get('raw_text', ''),
                'extracted_fields': result.get('fields', {}),
            }
            invoice.ocr_confidence = result.get('confidence', 0.0)
            invoice.ocr_processed = True

            if result.get('success') and result.get('fields'):
                fields = result['fields']
                # Auto-populate invoice fields from OCR
                if fields.get('invoice_number'):
                    invoice.invoice_number = invoice.invoice_number or fields['invoice_number']
                if fields.get('vendor_name'):
                    invoice.vendor_name_raw = invoice.vendor_name_raw or fields['vendor_name']
                if fields.get('vendor_gstin'):
                    invoice.vendor_gstin = fields['vendor_gstin']
                if fields.get('po_number'):
                    invoice.po_number = invoice.po_number or fields['po_number']
                if fields.get('total_amount'):
                    invoice.total_amount = fields['total_amount']
                if fields.get('subtotal'):
                    invoice.subtotal = fields['subtotal']
                if fields.get('tax_amount'):
                    invoice.tax_amount = fields['tax_amount']
                if fields.get('line_items'):
                    invoice.line_items = fields['line_items']
                invoice.status = 'ocr_complete'
            else:
                invoice.ocr_error = result.get('error', 'OCR extraction failed.')

            invoice.save()

            return Response({
                'success': True,
                'message': 'OCR processing complete.',
                'data': InvoiceSerializer(invoice, context={'request': request}).data,
                'ocr_result': result,
            })

        except Exception as e:
            logger.error(f"OCR processing error for invoice {invoice.id}: {e}")
            return Response({
                'success': False,
                'message': f'OCR processing failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['put', 'patch'], url_path='correct')
    def correct_ocr(self, request, pk=None):
        """
        Save manually corrected OCR fields.
        PUT /api/invoices/{id}/correct/
        """
        invoice = self.get_object()
        serializer = OCRCorrectionSerializer(invoice, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': 'Invoice data corrected and saved.',
                'data': InvoiceSerializer(updated, context={'request': request}).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='validate')
    def run_validation(self, request, pk=None):
        """
        Run validation checks on invoice.
        POST /api/invoices/{id}/validate/
        """
        invoice = self.get_object()
        errors = validate_invoice(invoice)
        invoice.validation_errors = errors

        has_errors = any(e['severity'] == 'error' for e in errors)
        if not has_errors and invoice.status in ['ocr_complete', 'draft', 'pending', 'validated']:
            invoice.status = 'validated'

        invoice.save()

        return Response({
            'success': True,
            'is_valid': not has_errors,
            'errors': errors,
            'data': InvoiceSerializer(invoice, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Dashboard statistics for invoices."""
        from django.db.models import Sum, Count, Avg
        from django.utils import timezone
        import datetime

        qs = Invoice.objects.all()
        today = timezone.now().date()
        month_start = today.replace(day=1)

        # Overall counts
        total = qs.count()
        pending = qs.filter(status__in=['pending', 'ocr_complete', 'validated']).count()
        approved = qs.filter(status__in=['ap_approved', 'manager_approved', 'finance_approved']).count()
        rejected = qs.filter(status='rejected').count()
        paid = qs.filter(status='paid').count()
        this_month = qs.filter(created_at__date__gte=month_start).count()

        # OCR Accuracy average
        ocr_avg = qs.filter(ocr_processed=True).aggregate(avg=Avg('ocr_confidence'))['avg'] or 0

        # Amount totals
        total_amount = qs.aggregate(total=Sum('total_amount'))['total'] or 0
        pending_amount = qs.filter(status__in=['pending', 'validated', 'ap_approved', 'manager_approved']).aggregate(total=Sum('total_amount'))['total'] or 0

        # Status breakdown for chart
        status_breakdown = list(
            qs.values('status').annotate(count=Count('id')).order_by('status')
        )

        # Monthly trend (last 6 months)
        monthly_trend = []
        for i in range(5, -1, -1):
            month_date = today - datetime.timedelta(days=i * 30)
            month_start_i = month_date.replace(day=1)
            if month_date.month == 12:
                month_end_i = month_date.replace(year=month_date.year + 1, month=1, day=1)
            else:
                month_end_i = month_date.replace(month=month_date.month + 1, day=1)
            count = qs.filter(created_at__date__gte=month_start_i, created_at__date__lt=month_end_i).count()
            monthly_trend.append({
                'month': month_date.strftime('%b %Y'),
                'count': count
            })

        return Response({
            'success': True,
            'data': {
                'total': total,
                'pending': pending,
                'approved': approved,
                'rejected': rejected,
                'paid': paid,
                'this_month': this_month,
                'ocr_accuracy': round(ocr_avg * 100, 1),
                'total_amount': float(total_amount),
                'pending_amount': float(pending_amount),
                'status_breakdown': status_breakdown,
                'monthly_trend': monthly_trend,
            }
        })
