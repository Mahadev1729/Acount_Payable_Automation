"""Purchase Order URL Configuration"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'grns', views.GoodsReceiptNoteViewSet, basename='grn')
router.register(r'', views.PurchaseOrderViewSet, basename='purchase-order')

urlpatterns = [
    path('', include(router.urls)),
]
