/**
 * Payments Page - Payment tracking, creation, PDF advice download
 */
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { paymentAPI, vendorAPI, invoiceAPI } from '../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  PlusIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, CreditCardIcon
} from '@heroicons/react/24/outline';

function PaymentForm({ onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { payment_mode: 'neft', currency: 'INR' }
  });
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      vendorAPI.getAll({ status: 'active', page_size: 200 }),
      invoiceAPI.getAll({ status: 'finance_approved', page_size: 200 }),
    ]).then(([vRes, iRes]) => {
      setVendors(vRes.data.results || vRes.data.data || []);
      setInvoices(iRes.data.results || iRes.data.data || []);
    });
  }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await paymentAPI.create(data);
      toast.success('Payment record created!');
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Invoice <span>*</span></label>
          <select className="form-control" {...register('invoice', { required: 'Invoice required' })}>
            <option value="">— Select Invoice —</option>
            {invoices.map(i => (
              <option key={i.id} value={i.id}>{i.invoice_number} — ₹{i.total_amount}</option>
            ))}
          </select>
          {errors.invoice && <p className="form-error">{errors.invoice.message}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Vendor <span>*</span></label>
          <select className="form-control" {...register('vendor', { required: 'Vendor required' })}>
            <option value="">— Select Vendor —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount (₹) <span>*</span></label>
          <input type="number" step="0.01" className="form-control"
            {...register('amount', { required: 'Amount required', min: 0.01 })} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Date <span>*</span></label>
          <input type="date" className="form-control"
            {...register('payment_date', { required: true })} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <select className="form-control" {...register('payment_mode')}>
            <option value="neft">NEFT</option>
            <option value="rtgs">RTGS</option>
            <option value="imps">IMPS</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online Transfer</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reference Number</label>
          <input className="form-control" placeholder="UTR/Cheque No." {...register('reference_number')} />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Remarks</label>
          <textarea className="form-control" rows={2} {...register('remarks')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Creating...' : 'Create Payment'}
        </button>
      </div>
    </form>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentAPI.getAll({ page, search, ...(statusFilter && { status: statusFilter }) });
      setPayments(res.data.results || res.data.data || []);
      setTotal(res.data.count || 0);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const downloadAdvice = async (id, paymentId) => {
    const tid = toast.loading('Generating PDF...');
    try {
      const res = await paymentAPI.downloadAdvice(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `Payment_Advice_${paymentId}.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('PDF downloaded!', { id: tid });
    } catch {
      toast.error('PDF generation failed', { id: tid });
    }
  };

  const formatDate = (d) => {
    try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; }
    catch { return d || '—'; }
  };

  return (
    <Layout title="Payments" subtitle={`${total} payment records`}>
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
          <MagnifyingGlassIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input placeholder="Search payment ID, vendor, reference..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control" style={{ width: 160 }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="initiated">Initiated</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} /> New Payment
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
          ) : payments.length === 0 ? (
            <div className="empty-state">
              <CreditCardIcon className="empty-state-icon" />
              <p className="empty-state-title">No payment records</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Invoice</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{p.payment_id}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.invoice_number || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{p.vendor_name || '—'}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td><span className="badge badge-blue">{p.payment_mode?.toUpperCase()}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{p.reference_number || '—'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => downloadAdvice(p.id, p.payment_id)}
                        title="Download Payment Advice PDF">
                        <ArrowDownTrayIcon style={{ width: 14, height: 14 }} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}
        title="Create Payment Record" size="md">
        <PaymentForm onSuccess={() => { setShowCreate(false); fetchPayments(); }}
          onCancel={() => setShowCreate(false)} />
      </Modal>
    </Layout>
  );
}
