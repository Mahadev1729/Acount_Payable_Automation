"""
Reports Views
Generates: AP Aging, Invoice Status, Vendor, Payment, GST, Audit Log reports.
Exports in: PDF, Excel, CSV formats.
"""
import datetime
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import FileResponse
from django.db.models import Sum, Count, Avg, Q

from apps.invoices.models import Invoice
from apps.vendors.models import Vendor
from apps.payments.models import Payment
from apps.approvals.models import AuditLog
from .exporters import export_to_csv, export_to_excel, export_to_pdf


class APAgingReportView(APIView):
    """
    AP Aging Report - categorizes outstanding invoices by age buckets.
    GET /api/reports/aging/?export=pdf|excel|csv
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        today = timezone.now().date()

        outstanding_invoices = Invoice.objects.filter(
            status__in=['validated', 'pending', 'ap_approved', 'manager_approved', 'finance_approved']
        ).select_related('vendor')

        buckets = {
            'current': {'label': 'Current (0-30 days)', 'invoices': [], 'total': 0},
            '31_60': {'label': '31-60 days', 'invoices': [], 'total': 0},
            '61_90': {'label': '61-90 days', 'invoices': [], 'total': 0},
            'over_90': {'label': 'Over 90 days', 'invoices': [], 'total': 0},
        }

        for inv in outstanding_invoices:
            age_date = inv.invoice_date or inv.created_at.date()
            age_days = (today - age_date).days
            inv_data = {
                'ID': inv.id,
                'Invoice Number': inv.invoice_number,
                'Vendor': inv.vendor.vendor_name if inv.vendor else inv.vendor_name_raw,
                'Invoice Date': str(inv.invoice_date or ''),
                'Due Date': str(inv.payment_due_date or ''),
                'Amount': float(inv.total_amount),
                'Status': inv.get_status_display(),
                'Age (Days)': age_days,
            }
            if age_days <= 30:
                buckets['current']['invoices'].append(inv_data)
                buckets['current']['total'] += float(inv.total_amount)
            elif age_days <= 60:
                buckets['31_60']['invoices'].append(inv_data)
                buckets['31_60']['total'] += float(inv.total_amount)
            elif age_days <= 90:
                buckets['61_90']['invoices'].append(inv_data)
                buckets['61_90']['total'] += float(inv.total_amount)
            else:
                buckets['over_90']['invoices'].append(inv_data)
                buckets['over_90']['total'] += float(inv.total_amount)

        if export_format:
            all_data = []
            for bucket in buckets.values():
                all_data.extend(bucket['invoices'])
            headers = ['Invoice Number', 'Vendor', 'Invoice Date', 'Due Date', 'Amount', 'Status', 'Age (Days)']
            return _export_response(all_data, headers, 'AP Aging Report', export_format)

        return Response({'success': True, 'data': buckets, 'generated_at': str(today)})


class InvoiceStatusReportView(APIView):
    """
    Invoice Status Report - all invoices with status breakdown.
    GET /api/reports/invoice-status/?export=pdf|excel|csv&status=pending
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        qs = Invoice.objects.select_related('vendor')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_from:
            qs = qs.filter(invoice_date__gte=date_from)
        if date_to:
            qs = qs.filter(invoice_date__lte=date_to)

        data = []
        for inv in qs:
            data.append({
                'Invoice Number': inv.invoice_number,
                'Vendor': inv.vendor.vendor_name if inv.vendor else inv.vendor_name_raw,
                'Invoice Date': str(inv.invoice_date or ''),
                'Due Date': str(inv.payment_due_date or ''),
                'PO Number': inv.po_number,
                'Subtotal': float(inv.subtotal),
                'Tax': float(inv.tax_amount),
                'Total Amount': float(inv.total_amount),
                'Status': inv.get_status_display(),
                'Match Status': inv.match_status,
                'Created At': inv.created_at.strftime('%d/%m/%Y'),
            })

        headers = ['Invoice Number', 'Vendor', 'Invoice Date', 'Due Date', 'PO Number',
                   'Subtotal', 'Tax', 'Total Amount', 'Status', 'Match Status', 'Created At']

        if export_format:
            return _export_response(data, headers, 'Invoice Status Report', export_format)

        # Summary stats
        summary = {
            'total': qs.count(),
            'total_amount': float(qs.aggregate(t=Sum('total_amount'))['t'] or 0),
            'by_status': list(qs.values('status').annotate(count=Count('id'), amount=Sum('total_amount'))),
        }

        return Response({'success': True, 'data': data, 'summary': summary})


class VendorReportView(APIView):
    """Vendor analytics report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        vendors = Vendor.objects.annotate(
            invoice_count=Count('invoices'),
            total_invoiced=Sum('invoices__total_amount'),
            total_paid=Sum('payments__amount', filter=Q(payments__status='paid')),
        )

        data = []
        for v in vendors:
            data.append({
                'Vendor Code': v.vendor_code,
                'Vendor Name': v.vendor_name,
                'GSTIN': v.gstin or '',
                'City': v.city,
                'State': v.state,
                'Status': v.status,
                'Invoice Count': v.invoice_count or 0,
                'Total Invoiced': float(v.total_invoiced or 0),
                'Total Paid': float(v.total_paid or 0),
                'Outstanding': float((v.total_invoiced or 0) - (v.total_paid or 0)),
            })

        headers = ['Vendor Code', 'Vendor Name', 'GSTIN', 'City', 'State', 'Status',
                   'Invoice Count', 'Total Invoiced', 'Total Paid', 'Outstanding']

        if export_format:
            return _export_response(data, headers, 'Vendor Report', export_format)

        return Response({'success': True, 'data': data})


class PaymentReportView(APIView):
    """Payment tracking report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        qs = Payment.objects.select_related('invoice', 'vendor')
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)

        data = []
        for p in qs:
            data.append({
                'Payment ID': p.payment_id,
                'Invoice Number': p.invoice.invoice_number if p.invoice else '',
                'Vendor': p.vendor.vendor_name if p.vendor else '',
                'Amount': float(p.amount),
                'Payment Date': str(p.payment_date or ''),
                'Payment Mode': p.get_payment_mode_display(),
                'Reference Number': p.reference_number,
                'Status': p.get_status_display(),
            })

        headers = ['Payment ID', 'Invoice Number', 'Vendor', 'Amount', 'Payment Date',
                   'Payment Mode', 'Reference Number', 'Status']

        if export_format:
            return _export_response(data, headers, 'Payment Report', export_format)

        return Response({'success': True, 'data': data})


class GSTReportView(APIView):
    """GST/Tax report for compliance."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        month = request.query_params.get('month')
        year = request.query_params.get('year', str(datetime.date.today().year))

        qs = Invoice.objects.filter(status__in=['finance_approved', 'paid', 'payment_initiated'])
        if month:
            qs = qs.filter(invoice_date__month=month)
        if year:
            qs = qs.filter(invoice_date__year=year)

        data = []
        for inv in qs.select_related('vendor'):
            data.append({
                'Invoice Number': inv.invoice_number,
                'Invoice Date': str(inv.invoice_date or ''),
                'Vendor Name': inv.vendor.vendor_name if inv.vendor else inv.vendor_name_raw,
                'Vendor GSTIN': inv.vendor_gstin,
                'Taxable Amount': float(inv.subtotal),
                'GST Amount': float(inv.tax_amount),
                'GST %': float(inv.tax_percentage),
                'Total Amount': float(inv.total_amount),
            })

        headers = ['Invoice Number', 'Invoice Date', 'Vendor Name', 'Vendor GSTIN',
                   'Taxable Amount', 'GST Amount', 'GST %', 'Total Amount']

        totals = qs.aggregate(
            total_taxable=Sum('subtotal'),
            total_gst=Sum('tax_amount'),
            grand_total=Sum('total_amount'),
        )

        if export_format:
            return _export_response(data, headers, f'GST Report - {month or "All"}/{year}', export_format)

        return Response({'success': True, 'data': data, 'totals': {
            'total_taxable': float(totals['total_taxable'] or 0),
            'total_gst': float(totals['total_gst'] or 0),
            'grand_total': float(totals['grand_total'] or 0),
        }})


class AuditLogReportView(APIView):
    """Audit log viewer with export."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_format = request.query_params.get('export')
        action_filter = request.query_params.get('action')

        qs = AuditLog.objects.select_related('user').order_by('-created_at')
        if action_filter:
            qs = qs.filter(action=action_filter)

        data = []
        for log in qs[:500]:  # Limit to 500
            data.append({
                'Date/Time': log.created_at.strftime('%d/%m/%Y %H:%M'),
                'User': log.user.get_full_name() if log.user else 'System',
                'Action': log.action,
                'Description': log.description,
                'Object Type': log.object_type,
                'Object ID': str(log.object_id or ''),
                'IP Address': log.ip_address or '',
            })

        headers = ['Date/Time', 'User', 'Action', 'Description', 'Object Type', 'Object ID', 'IP Address']

        if export_format:
            return _export_response(data, headers, 'Audit Log', export_format)

        return Response({'success': True, 'data': data})


def _export_response(data, headers, title, export_format):
    """Helper to return export file response based on format."""
    from django.http import FileResponse, HttpResponse

    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M')
    safe_title = title.replace(' ', '_')

    if export_format == 'csv':
        buffer = export_to_csv(data, headers)
        response = HttpResponse(buffer.read(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{safe_title}_{timestamp}.csv"'
        return response

    elif export_format == 'excel':
        buffer = export_to_excel(data, headers, sheet_name=title)
        response = FileResponse(buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{safe_title}_{timestamp}.xlsx"'
        return response

    elif export_format == 'pdf':
        buffer = export_to_pdf(title, data, headers, landscape_mode=len(headers) > 6)
        response = FileResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{safe_title}_{timestamp}.pdf"'
        return response

    return Response({'error': 'Invalid export format. Use: pdf, excel, csv'}, status=400)
