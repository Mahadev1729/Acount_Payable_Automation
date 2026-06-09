"""
Root URL Configuration for AP Automation System
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication APIs
    path('api/auth/', include('apps.authentication.urls')),

    # Vendor Management APIs
    path('api/vendors/', include('apps.vendors.urls')),

    # Invoice & OCR APIs
    path('api/invoices/', include('apps.invoices.urls')),

    # Purchase Orders & Matching APIs
    path('api/purchase-orders/', include('apps.purchase_orders.urls')),

    # Approval Workflow APIs
    path('api/approvals/', include('apps.approvals.urls')),

    # Payment Module APIs
    path('api/payments/', include('apps.payments.urls')),

    # Reports & Exports APIs
    path('api/reports/', include('apps.reports.urls')),
]

# Serve media files in development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
