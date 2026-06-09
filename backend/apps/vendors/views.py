"""
Vendor Views - Full CRUD with filtering, search, pagination
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Vendor
from .serializers import VendorSerializer, VendorListSerializer


class VendorViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Vendor management.
    GET/POST    /api/vendors/
    GET/PUT/PATCH/DELETE /api/vendors/{id}/
    """
    queryset = Vendor.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'city', 'state', 'msme_registered']
    search_fields = ['vendor_name', 'company_name', 'email', 'gstin', 'pan', 'vendor_code']
    ordering_fields = ['vendor_name', 'created_at', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return VendorListSerializer
        return VendorSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data, 'count': queryset.count()})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            vendor = serializer.save()
            return Response({
                'success': True,
                'message': 'Vendor created successfully.',
                'data': VendorSerializer(vendor).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            vendor = serializer.save()
            return Response({'success': True, 'message': 'Vendor updated.', 'data': VendorSerializer(vendor).data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        vendor = self.get_object()
        vendor.status = 'inactive'
        vendor.save()
        return Response({'success': True, 'message': 'Vendor deactivated.'})

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        vendor = self.get_object()
        vendor.status = 'active'
        vendor.save()
        return Response({'success': True, 'message': 'Vendor activated.'})

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Get vendor statistics for dashboard."""
        total = Vendor.objects.count()
        active = Vendor.objects.filter(status='active').count()
        pending = Vendor.objects.filter(status='pending').count()
        inactive = Vendor.objects.filter(status='inactive').count()
        return Response({
            'success': True,
            'data': {
                'total': total,
                'active': active,
                'pending': pending,
                'inactive': inactive,
            }
        })
