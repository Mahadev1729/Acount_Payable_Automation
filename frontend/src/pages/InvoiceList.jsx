/**
 * Invoice List Page - Search, Filter, Pagination, Actions
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import { invoiceAPI } from '../api';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, FunnelIcon, EyeIcon,
  CpuChipIcon, TrashIcon, PlusIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, search, ...(statusFilter && { status: statusFilter }) };
      const res = await invoiceAPI.getAll(params);
      const data = res.data;
      setInvoices(data.results || data.data || []);
      setTotal(data.count || 0);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleRunOCR = async (e, id) => {
    e.stopPropagation();
    const tid = toast.loading('Running OCR...');
    try {
      await invoiceAPI.runOCR(id);
      toast.success('OCR complete!', { id: tid });
      fetchInvoices();
    } catch {
      toast.error('OCR failed', { id: tid });
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.delete(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatAmount = (amt) =>
    amt ? `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

  const formatDate = (d) => {
    try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; }
    catch { return d || '—'; }
  };

  return (
    <Layout title="Invoices" subtitle={`${total} invoices found`}>
      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
          <MagnifyingGlassIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input
            id="invoice-search"
            placeholder="Search invoice no., vendor, GST..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          id="status-filter"
          className="form-control"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="ocr_complete">OCR Complete</option>
          <option value="validated">Validated</option>
          <option value="po_matched">PO Matched</option>
          <option value="ap_approved">AP Approved</option>
          <option value="manager_approved">Manager Approved</option>
          <option value="finance_approved">Finance Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchInvoices}>
            <FunnelIcon style={{ width: 16, height: 16 }} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/invoices/upload')}>
            <PlusIcon style={{ width: 16, height: 16 }} /> Upload Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner spinner-lg" />
              <span>Loading invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <DocumentIcon className="empty-state-icon" style={{ width: 56, height: 56 }} />
              <p className="empty-state-title">No invoices found</p>
              <p className="empty-state-text">Upload your first invoice to get started</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }}
                onClick={() => navigate('/invoices/upload')}>
                <PlusIcon style={{ width: 18, height: 18 }} /> Upload Invoice
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Vendor</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>PO No.</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Match</th>
                  <th>OCR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {inv.invoice_number || `#${inv.id}`}
                      </span>
                      {inv.is_duplicate && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>DUP</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.vendor_name || '—'}</div>
                      {inv.vendor_gstin && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.vendor_gstin}</div>
                      )}
                    </td>
                    <td>{formatDate(inv.invoice_date)}</td>
                    <td style={{ color: inv.is_overdue ? 'var(--danger)' : undefined }}>
                      {formatDate(inv.payment_due_date)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.po_number || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatAmount(inv.total_amount)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td><StatusBadge status={inv.match_status} /></td>
                    <td>
                      {inv.ocr_processed ? (
                        <span style={{ color: 'var(--success)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {inv.ocr_confidence ? `${(inv.ocr_confidence * 100).toFixed(0)}%` : '✓'}
                        </span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <EyeIcon style={{ width: 15, height: 15 }} />
                        </button>
                        {!inv.ocr_processed && (
                          <button className="btn btn-ghost btn-sm" title="Run OCR"
                            onClick={e => handleRunOCR(e, inv.id)}>
                            <CpuChipIcon style={{ width: 15, height: 15, color: 'var(--primary)' }} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" title="Delete"
                          onClick={e => handleDelete(e, inv.id)}>
                          <TrashIcon style={{ width: 15, height: 15, color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of {total} invoices
            </span>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} className={`page-btn ${page === p ? 'active' : ''}`}
                    onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === totalPages}>›</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function DocumentIcon({ className, style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
