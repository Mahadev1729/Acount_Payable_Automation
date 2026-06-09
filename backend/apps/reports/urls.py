"""Reports URL Configuration"""
from django.urls import path
from . import views

urlpatterns = [
    path('aging/', views.APAgingReportView.as_view(), name='ap-aging-report'),
    path('invoice-status/', views.InvoiceStatusReportView.as_view(), name='invoice-status-report'),
    path('vendors/', views.VendorReportView.as_view(), name='vendor-report'),
    path('payments/', views.PaymentReportView.as_view(), name='payment-report'),
    path('gst/', views.GSTReportView.as_view(), name='gst-report'),
    path('audit-logs/', views.AuditLogReportView.as_view(), name='audit-log-report'),
]
