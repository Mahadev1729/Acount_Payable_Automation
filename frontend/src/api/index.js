import api from './client';

export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  register: (data) => api.post('/auth/register/', data),
  refreshToken: (refresh) => api.post('/auth/refresh/', { refresh }),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  getUsers: (params) => api.get('/auth/users/', { params }),
  createUser: (data) => api.post('/auth/users/', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}/`),
  toggleUserStatus: (id) => api.post(`/auth/users/${id}/toggle-status/`),
};

export const vendorAPI = {
  getAll: (params) => api.get('/vendors/', { params }),
  getById: (id) => api.get(`/vendors/${id}/`),
  create: (data) => api.post('/vendors/', data),
  update: (id, data) => api.put(`/vendors/${id}/`, data),
  delete: (id) => api.delete(`/vendors/${id}/`),
  activate: (id) => api.post(`/vendors/${id}/activate/`),
  getStats: () => api.get('/vendors/stats/'),
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices/', { params }),
  getById: (id) => api.get(`/invoices/${id}/`),
  upload: (formData) => api.post('/invoices/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bulkUpload: (formData) => api.post('/invoices/bulk-upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  runOCR: (id) => api.post(`/invoices/${id}/run-ocr/`),
  correctOCR: (id, data) => api.put(`/invoices/${id}/correct/`, data),
  validate: (id) => api.post(`/invoices/${id}/validate/`),
  update: (id, data) => api.put(`/invoices/${id}/`, data),
  delete: (id) => api.delete(`/invoices/${id}/`),
  getStats: () => api.get('/invoices/stats/'),
};

export const purchaseOrderAPI = {
  getAll: (params) => api.get('/purchase-orders/', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}/`),
  create: (data) => api.post('/purchase-orders/', data),
  update: (id, data) => api.put(`/purchase-orders/${id}/`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}/`),
  matchInvoice: (id, data) => api.post(`/purchase-orders/${id}/match/`, data),
  getGRNs: (params) => api.get('/purchase-orders/grns/', { params }),
  createGRN: (data) => api.post('/purchase-orders/grns/', data),
};

export const approvalAPI = {
  getAll: (params) => api.get('/approvals/', { params }),
  getById: (id) => api.get(`/approvals/${id}/`),
  getPending: () => api.get('/approvals/pending/'),
  takeAction: (id, data) => api.post(`/approvals/${id}/action/`, data),
  initiateWorkflow: (invoiceId) => api.post('/approvals/initiate/', { invoice_id: invoiceId }),
  getAuditLogs: (params) => api.get('/approvals/audit-logs/', { params }),
};

export const paymentAPI = {
  getAll: (params) => api.get('/payments/', { params }),
  getById: (id) => api.get(`/payments/${id}/`),
  create: (data) => api.post('/payments/', data),
  update: (id, data) => api.put(`/payments/${id}/`, data),
  downloadAdvice: (id) => api.get(`/payments/${id}/advice/`, { responseType: 'blob' }),
  getStats: () => api.get('/payments/stats/'),
};

export const reportsAPI = {
  getAgingReport: (params) => api.get('/reports/aging/', { params }),
  getInvoiceStatus: (params) => api.get('/reports/invoice-status/', { params }),
  getVendorReport: (params) => api.get('/reports/vendors/', { params }),
  getPaymentReport: (params) => api.get('/reports/payments/', { params }),
  getGSTReport: (params) => api.get('/reports/gst/', { params }),
  getAuditLogs: (params) => api.get('/reports/audit-logs/', { params }),
  exportReport: (endpoint, params) => api.get(endpoint, {
    params,
    responseType: 'blob',
  }),
};
